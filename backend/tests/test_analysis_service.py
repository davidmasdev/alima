from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.analisis import Analisis
from app.models.perfil_nutricional import PerfilNutricional
from app.models.usuario import Usuario
from app.schemas.analysis import AnalysisRequest
from app.services import analysis
from app.services.analysis import DailyAnalysisSummary, generate_diet_analysis, parse_analysis_content


class FakeSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.committed = False

    def add(self, item: object) -> None:
        self.added.append(item)

    def commit(self) -> None:
        self.committed = True

    def refresh(self, item: object) -> None:
        item.id = uuid4()


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


def make_history() -> list[DailyAnalysisSummary]:
    return [
        DailyAnalysisSummary(
            fecha=date(2026, 4, 30),
            calorias=1900,
            proteinas=80,
            carbohidratos=220,
            grasas=55,
            alimentos=["Arroz (100g)", "Pollo (150g)"],
        ),
        DailyAnalysisSummary(
            fecha=date(2026, 5, 1),
            calorias=2100,
            proteinas=95,
            carbohidratos=240,
            grasas=60,
            alimentos=["Pasta (100g)", "Atun (120g)"],
        ),
        DailyAnalysisSummary(
            fecha=date(2026, 5, 2),
            calorias=2000,
            proteinas=88,
            carbohidratos=230,
            grasas=58,
            alimentos=["Avena (80g)", "Yogur (125g)"],
        ),
    ]


def test_parse_analysis_content_validates_structured_json() -> None:
    content = parse_analysis_content(
        """
        {
          "puntuacion": 63,
          "estado_proteinas": "Necesitas mas",
          "estado_carbohidratos": "Bajar cantidad",
          "estado_grasas": "OK",
          "estado_micronutrientes": "Faltan vitaminas",
          "consejo": "Aumenta las proteinas y varia mas la dieta."
        }
        """
    )

    assert content.puntuacion == 63
    assert content.estado_micronutrientes == "Faltan vitaminas"


def test_generate_diet_analysis_requires_three_days(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(analysis, "collect_recent_history", lambda *args: make_history()[:2])

    with pytest.raises(HTTPException) as exc_info:
        generate_diet_analysis(FakeSession(), make_user(), AnalysisRequest(fecha=date(2026, 5, 2)))

    assert exc_info.value.status_code == 422


def test_generate_diet_analysis_saves_ai_result(monkeypatch: pytest.MonkeyPatch) -> None:
    db = FakeSession()
    monkeypatch.setattr(analysis, "collect_recent_history", lambda *args: make_history())
    monkeypatch.setattr(
        analysis,
        "call_gemini",
        lambda prompt, ai_client=None, response_schema=None: """
        {
          "puntuacion": 84,
          "estado_proteinas": "OK",
          "estado_carbohidratos": "OK",
          "estado_grasas": "OK",
          "estado_micronutrientes": "Mejorar variedad",
          "consejo": "La dieta esta equilibrada, pero conviene incluir mas verduras."
        }
        """,
    )

    response = generate_diet_analysis(
        db,
        make_user(),
        AnalysisRequest(fecha=date(2026, 5, 2)),
    )

    assert db.committed is True
    assert len(db.added) == 1
    assert isinstance(db.added[0], Analisis)
    assert response.puntuacion == 84
    assert response.dias_analizados == 3
    assert response.estado_micronutrientes == "Mejorar variedad"
