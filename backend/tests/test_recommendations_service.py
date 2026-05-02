from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.perfil_nutricional import PerfilNutricional
from app.models.recomendacion import Recomendacion
from app.models.usuario import Usuario
from app.schemas.daily_log import (
    DailyEntryResponse,
    DailyLogResponse,
    DailyTotalsResponse,
    MealLogResponse,
)
from app.schemas.recommendations import RecommendationRequest
from app.services import recommendations
from app.services.recommendations import (
    calculate_remaining,
    generate_recommendation,
    get_macro_targets,
    parse_gemini_response,
    parse_recommendation_content,
)


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


def make_user(with_profile: bool = True) -> Usuario:
    user = Usuario(
        email="user@example.com",
        contrasena_hash="hash",
        validada=False,
        nombre="David",
        fecha_nacimiento=date(2000, 1, 1),
    )
    user.id = uuid4()
    if with_profile:
        user.perfil_nutricional = PerfilNutricional(
            peso=80,
            altura=180,
            sexo="male",
            nivel_actividad="moderate",
            objetivo="maintain",
            calorias_diarias=2200,
        )
    return user


def make_daily_log() -> DailyLogResponse:
    return DailyLogResponse(
        fecha=date(2026, 5, 2),
        meal_types=["Desayuno", "Comida", "Cena"],
        totals=DailyTotalsResponse(
            calorias=900,
            proteinas=45,
            carbohidratos=110,
            grasas=30,
        ),
        meals=[
            MealLogResponse(
                tipo="Desayuno",
                calorias=900,
                proteinas=45,
                carbohidratos=110,
                grasas=30,
                entries=[
                    DailyEntryResponse(
                        id=uuid4(),
                        alimento_id=uuid4(),
                        alimento_nombre="Avena",
                        cantidad=80,
                        unidad="g",
                        calorias=300,
                        proteinas=12,
                        carbohidratos=50,
                        grasas=6,
                    )
                ],
            )
        ],
    )


def test_get_macro_targets_requires_nutrition_profile() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_macro_targets(make_user(with_profile=False))

    assert exc_info.value.status_code == 422


def test_calculate_remaining_subtracts_daily_totals() -> None:
    remaining = calculate_remaining(
        make_daily_log(),
        {
            "calorias": 2200,
            "proteinas": 96,
            "carbohidratos": 275,
            "grasas": 64,
        },
    )

    assert remaining == {
        "calorias": 1300,
        "proteinas": 51,
        "carbohidratos": 165,
        "grasas": 34,
    }


def test_parse_gemini_response_joins_text_parts() -> None:
    text = parse_gemini_response(
        {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Tortilla con verduras"},
                            {"text": "y pan integral"},
                        ]
                    }
                }
            ]
        }
    )

    assert text == "Tortilla con verduras\ny pan integral"


def test_parse_gemini_response_rejects_empty_payload() -> None:
    with pytest.raises(HTTPException) as exc_info:
        parse_gemini_response({"candidates": []})

    assert exc_info.value.status_code == 503


def test_parse_recommendation_content_validates_structured_json() -> None:
    content = parse_recommendation_content(
        """
        {
          "nombre": "Ensalada de pollo",
          "alimentos": [
            {
              "nombre": "Pollo",
              "cantidad": 150,
              "unidad": "g",
              "calorias": 250,
              "proteinas": 35,
              "carbohidratos": 0,
              "grasas": 8
            }
          ],
          "calorias": 250,
          "proteinas": 35,
          "carbohidratos": 0,
          "grasas": 8,
          "explicacion": "Aporta proteina sin exceder calorias."
        }
        """
    )

    assert content.nombre == "Ensalada de pollo"
    assert content.alimentos[0].cantidad == 150


def test_generate_recommendation_saves_ai_result(monkeypatch: pytest.MonkeyPatch) -> None:
    user = make_user()
    db = FakeSession()
    monkeypatch.setattr(recommendations, "get_daily_log", lambda *args: make_daily_log())
    monkeypatch.setattr(
        recommendations,
        "call_gemini",
        lambda prompt, ai_client=None: """
        {
          "nombre": "Ensalada de pollo",
          "alimentos": [
            {
              "nombre": "Pollo",
              "cantidad": 150,
              "unidad": "g",
              "calorias": 250,
              "proteinas": 35,
              "carbohidratos": 0,
              "grasas": 8
            }
          ],
          "calorias": 250,
          "proteinas": 35,
          "carbohidratos": 0,
          "grasas": 8,
          "explicacion": "Aporta proteina sin exceder calorias."
        }
        """,
    )

    response = generate_recommendation(
        db,
        user,
        RecommendationRequest(fecha=date(2026, 5, 2), prompt="algo ligero"),
    )

    assert db.committed is True
    assert len(db.added) == 1
    assert isinstance(db.added[0], Recomendacion)
    assert db.added[0].prompt == "algo ligero"
    assert response.contenido.nombre == "Ensalada de pollo"
    assert response.contenido.alimentos[0].nombre == "Pollo"
    assert response.calorias_restantes == 1300
    assert response.proteinas_restantes == 51
