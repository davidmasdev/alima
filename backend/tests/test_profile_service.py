from datetime import date

import pytest

from app.models.perfil_nutricional import PerfilNutricional
from app.models.usuario import Usuario
from app.schemas.profile import ProfileUpsertRequest
from app.services import profile


class FakeSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.deleted: list[object] = []
        self.committed = False
        self.refreshed: object | None = None

    def add(self, item: object) -> None:
        self.added.append(item)

    def commit(self) -> None:
        self.committed = True

    def refresh(self, item: object) -> None:
        self.refreshed = item

    def delete(self, item: object) -> None:
        self.deleted.append(item)


def make_payload(**overrides: object) -> ProfileUpsertRequest:
    data = {
        "nombre": "David",
        "fecha_nacimiento": date(2000, 1, 1),
        "sexo": "male",
        "nivel_actividad": "moderate",
        "objetivo": "maintain",
        "peso": 80.0,
        "altura": 180,
    }
    data.update(overrides)
    return ProfileUpsertRequest(**data)


def test_get_profile_without_nutrition_data_returns_null_fields() -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)

    response = profile.get_profile(user)

    assert response.email == "user@example.com"
    assert response.peso is None
    assert response.calorias_diarias is None


def test_upsert_profile_creates_nutrition_profile() -> None:
    db = FakeSession()
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)

    response = profile.upsert_profile(db, user, make_payload())

    assert db.committed is True
    assert user.nombre == "David"
    assert user.perfil_nutricional is not None
    assert user.perfil_nutricional.peso == 80.0
    assert response.tmb is not None
    assert response.get is not None
    assert response.calorias_diarias is not None


def test_upsert_profile_updates_existing_profile() -> None:
    db = FakeSession()
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    user.perfil_nutricional = PerfilNutricional(
        peso=70.0,
        altura=170,
        sexo="female",
        nivel_actividad="light",
        objetivo="lose",
        calorias_diarias=1400,
    )

    response = profile.upsert_profile(db, user, make_payload(peso=85.0, objetivo="gain"))

    assert db.committed is True
    assert user.perfil_nutricional.peso == 85.0
    assert user.perfil_nutricional.objetivo == "gain"
    assert response.peso == 85.0


def test_delete_account_deletes_user() -> None:
    db = FakeSession()
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)

    profile.delete_account(db, user)

    assert db.deleted == [user]
    assert db.committed is True


def test_calculate_daily_calories_rejects_future_birth_date() -> None:
    with pytest.raises(Exception):
        profile.calculate_daily_calories(make_payload(fecha_nacimiento=date(2999, 1, 1)))


def test_calorie_calculation_exposes_basal_get_and_goal_adjustment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FixedDate(date):
        @classmethod
        def today(cls) -> date:
            return date(2026, 5, 3)

    monkeypatch.setattr(profile, "date", FixedDate)
    payload = make_payload(
        fecha_nacimiento=date(2000, 1, 1),
        sexo="male",
        peso=90,
        altura=176,
        nivel_actividad="sedentary",
        objetivo="lose",
    )

    assert profile.calculate_basal_metabolic_rate(payload) == 1875
    assert profile.calculate_total_daily_energy_expenditure(payload) == 2250
    assert profile.calculate_daily_calories(payload) == 1750


def test_daily_calories_has_minimum_floor(monkeypatch: pytest.MonkeyPatch) -> None:
    class FixedDate(date):
        @classmethod
        def today(cls) -> date:
            return date(2026, 5, 3)

    monkeypatch.setattr(profile, "date", FixedDate)
    payload = make_payload(
        fecha_nacimiento=date(2000, 1, 1),
        sexo="female",
        peso=40,
        altura=150,
        nivel_actividad="sedentary",
        objetivo="lose",
    )

    assert profile.calculate_daily_calories(payload) == 1200
