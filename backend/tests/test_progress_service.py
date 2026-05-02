from datetime import date
from uuid import uuid4

import pytest

from app.models.perfil_nutricional import PerfilNutricional
from app.models.registro_peso import RegistroPeso
from app.models.usuario import Usuario
from app.schemas.progress import WeightUpsertRequest
from app.services import progress
from app.services.progress import build_days, calculate_compliance, calculate_streak, save_weight


class FakeSession:
    def __init__(self, scalar_results: list[object | None]) -> None:
        self.scalar_results = scalar_results
        self.added: list[object] = []
        self.committed = False

    def scalar(self, statement: object) -> object | None:
        return self.scalar_results.pop(0)

    def add(self, item: object) -> None:
        self.added.append(item)

    def commit(self) -> None:
        self.committed = True

    def refresh(self, item: object) -> None:
        pass


def make_user() -> Usuario:
    user = Usuario(
        email="user@example.com",
        contrasena_hash="hash",
        validada=False,
        nombre="David",
        fecha_nacimiento=date(2000, 1, 1),
    )
    user.id = uuid4()
    user.perfil_nutricional = PerfilNutricional(
        peso=80,
        altura=180,
        sexo="male",
        nivel_actividad="moderate",
        objetivo="maintain",
        calorias_diarias=2200,
    )
    return user


def test_calculate_compliance_uses_ten_percent_margin() -> None:
    assert calculate_compliance(1900, 2000, True) is True
    assert calculate_compliance(2200, 2000, True) is True
    assert calculate_compliance(1799, 2000, True) is False
    assert calculate_compliance(2201, 2000, True) is False
    assert calculate_compliance(0, 2000, False) is None


def test_build_days_marks_registered_and_empty_days() -> None:
    days = build_days(
        {date(2026, 5, 1): 1900},
        date(2026, 5, 1),
        date(2026, 5, 2),
        2000,
    )

    assert len(days) == 2
    assert days[0].registrado is True
    assert days[0].cumplido is True
    assert days[1].registrado is False
    assert days[1].cumplido is None


def test_calculate_streak_counts_completed_days_from_end() -> None:
    days = build_days(
        {
            date(2026, 5, 1): 2500,
            date(2026, 5, 2): 2000,
            date(2026, 5, 3): 1900,
        },
        date(2026, 5, 1),
        date(2026, 5, 3),
        2000,
    )

    assert calculate_streak(days) == 2


def test_save_weight_creates_record_and_updates_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    user = make_user()
    db = FakeSession([None, None])
    monkeypatch.setattr(progress, "calculate_daily_calories", lambda payload: 2100)
    monkeypatch.setattr(progress, "get_progress", lambda *args: "updated-progress")

    response = save_weight(
        db,
        user,
        WeightUpsertRequest(fecha=date(2026, 5, 2), peso=78.5),
        "week",
        date(2026, 5, 2),
    )

    assert response == "updated-progress"
    assert db.committed is True
    assert isinstance(db.added[0], RegistroPeso)
    assert db.added[0].peso == 78.5
    assert user.perfil_nutricional.peso == 78.5
    assert user.perfil_nutricional.calorias_diarias == 2100


def test_save_weight_updates_existing_record(monkeypatch: pytest.MonkeyPatch) -> None:
    user = make_user()
    existing_record = RegistroPeso(usuario=user, fecha=date(2026, 5, 2), peso=80)
    db = FakeSession([date(2026, 5, 2), existing_record])
    monkeypatch.setattr(progress, "get_progress", lambda *args: "updated-progress")

    save_weight(
        db,
        user,
        WeightUpsertRequest(fecha=date(2026, 5, 2), peso=79.2),
        "week",
        date(2026, 5, 2),
    )

    assert db.added == []
    assert existing_record.peso == 79.2
    assert user.perfil_nutricional.peso == 79.2
