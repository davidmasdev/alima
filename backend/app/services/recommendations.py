import json
import logging
from datetime import date
from typing import Any, Protocol

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.alimento import Alimento
from app.models.comida import Comida
from app.models.recomendacion import Recomendacion
from app.models.registro import Registro
from app.models.usuario import Usuario
from app.schemas.daily_log import DailyLogResponse
from app.schemas.recommendations import (
    RecommendationApplyRequest,
    RecommendationContent,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.daily_log import ensure_default_meal_types, get_daily_log


logger = logging.getLogger(__name__)
MAX_LOGGED_AI_BODY_LENGTH = 2000

GEMINI_RECOMMENDATION_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "nombre": {"type": "STRING"},
        "alimentos": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "nombre": {"type": "STRING"},
                    "cantidad": {"type": "NUMBER"},
                    "unidad": {"type": "STRING", "enum": ["g", "ml"]},
                    "calorias": {"type": "NUMBER"},
                    "proteinas": {"type": "NUMBER"},
                    "carbohidratos": {"type": "NUMBER"},
                    "grasas": {"type": "NUMBER"},
                },
                "required": [
                    "nombre",
                    "cantidad",
                    "unidad",
                    "calorias",
                    "proteinas",
                    "carbohidratos",
                    "grasas",
                ],
                "propertyOrdering": [
                    "nombre",
                    "cantidad",
                    "unidad",
                    "calorias",
                    "proteinas",
                    "carbohidratos",
                    "grasas",
                ],
            },
        },
        "calorias": {"type": "NUMBER"},
        "proteinas": {"type": "NUMBER"},
        "carbohidratos": {"type": "NUMBER"},
        "grasas": {"type": "NUMBER"},
        "explicacion": {"type": "STRING"},
    },
    "required": [
        "nombre",
        "alimentos",
        "calorias",
        "proteinas",
        "carbohidratos",
        "grasas",
        "explicacion",
    ],
    "propertyOrdering": [
        "nombre",
        "alimentos",
        "calorias",
        "proteinas",
        "carbohidratos",
        "grasas",
        "explicacion",
    ],
}


class AiClient(Protocol):
    def post(self, url: str, *, json: dict[str, Any], timeout: int) -> httpx.Response:
        ...


def get_macro_targets(user: Usuario) -> dict[str, float]:
    profile = user.perfil_nutricional
    if profile is None or profile.calorias_diarias is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Completa tu perfil nutricional antes de pedir recomendaciones",
        )

    return {
        "calorias": round(profile.calorias_diarias, 2),
        "proteinas": round(profile.peso * 1.2, 2),
        "carbohidratos": round((profile.calorias_diarias * 0.5) / 4, 2),
        "grasas": round(profile.peso * 0.8, 2),
    }


def calculate_remaining(
    daily_log: DailyLogResponse,
    targets: dict[str, float],
) -> dict[str, float]:
    return {
        "calorias": round(targets["calorias"] - daily_log.totals.calorias, 2),
        "proteinas": round(targets["proteinas"] - daily_log.totals.proteinas, 2),
        "carbohidratos": round(targets["carbohidratos"] - daily_log.totals.carbohidratos, 2),
        "grasas": round(targets["grasas"] - daily_log.totals.grasas, 2),
    }


def build_ai_prompt(
    user: Usuario,
    daily_log: DailyLogResponse,
    targets: dict[str, float],
    remaining: dict[str, float],
    user_prompt: str,
) -> str:
    profile = user.perfil_nutricional
    meals_summary = []
    for meal in daily_log.meals:
        if meal.entries:
            foods = ", ".join(
                f"{entry.alimento_nombre} ({entry.cantidad}{entry.unidad})"
                for entry in meal.entries
            )
            meals_summary.append(f"- {meal.tipo}: {foods}. Total {meal.calorias} kcal")

    consumed_text = "\n".join(meals_summary) if meals_summary else "No hay comidas registradas hoy."
    preference = user_prompt.strip() or "Sin preferencia concreta."

    return f"""
Eres un nutricionista. Recomienda una comida concreta para hoy.

Perfil:
- Objetivo del usuario: {profile.objetivo if profile else "desconocido"}
- Calorias diarias objetivo: {targets["calorias"]} kcal
- Peso: {profile.peso if profile else "desconocido"} kg

Consumido hoy:
{consumed_text}

Totales consumidos:
- Calorias: {daily_log.totals.calorias} kcal
- Proteinas: {daily_log.totals.proteinas} g
- Carbohidratos: {daily_log.totals.carbohidratos} g
- Grasas: {daily_log.totals.grasas} g

Restante recomendado:
- Calorias: {remaining["calorias"]} kcal
- Proteinas: {remaining["proteinas"]} g
- Carbohidratos: {remaining["carbohidratos"]} g
- Grasas: {remaining["grasas"]} g

Preferencia del usuario: {preference}

Devuelve solo una comida concreta y sencilla, con 2 a 4 alimentos.
La respuesta debe ajustarse al esquema JSON indicado por la API.
Usa solo unidades "g" o "ml".
Los macros de cada alimento deben corresponder a la cantidad indicada.
No recomiendes opciones que excedan claramente las calorias restantes.
""".strip()


def parse_gemini_response(payload: dict[str, Any]) -> str:
    try:
        candidate = payload["candidates"][0]
        finish_reason = candidate.get("finishReason")
        logger.info("Gemini candidate finishReason=%s", finish_reason)
        if finish_reason and finish_reason not in {"STOP", "FINISH_REASON_UNSPECIFIED"}:
            logger.error("Gemini stopped with finishReason=%s. Payload: %s", finish_reason, payload)
        parts = candidate["content"]["parts"]
        text = "\n".join(part.get("text", "") for part in parts).strip()
    except (KeyError, IndexError, TypeError, AttributeError) as error:
        logger.exception("Gemini response has an unexpected shape: %s", payload)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La IA no devolvio una respuesta valida",
        ) from error

    if not text:
        logger.error("Gemini response did not contain text: %s", payload)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La IA no devolvio una respuesta valida",
        )
    return text


def parse_recommendation_content(raw_result: str) -> RecommendationContent:
    cleaned = raw_result.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        payload = json.loads(cleaned)
        return RecommendationContent.model_validate(payload)
    except (json.JSONDecodeError, ValueError) as error:
        logger.exception(
            "AI recommendation could not be parsed as structured JSON. Raw result: %s",
            cleaned[:MAX_LOGGED_AI_BODY_LENGTH],
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La IA no devolvio una recomendacion estructurada valida",
        ) from error


def call_gemini(prompt: str, client: AiClient | None = None) -> str:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No hay una API key de Gemini configurada",
        )

    http_client = client or httpx.Client(
        timeout=httpx.Timeout(
            settings.ai_request_timeout_seconds,
            connect=10,
            read=settings.ai_request_timeout_seconds,
        )
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )
    safe_url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key=***"
    )
    try:
        logger.info(
            (
                "Calling Gemini model=%s timeout=%ss max_output_tokens=%s "
                "thinking_budget=%s prompt_chars=%s"
            ),
            settings.gemini_model,
            settings.ai_request_timeout_seconds,
            settings.ai_max_output_tokens,
            settings.ai_thinking_budget,
            len(prompt),
        )
        response = http_client.post(
            url,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": settings.ai_max_output_tokens,
                    "thinkingConfig": {
                        "thinkingBudget": settings.ai_thinking_budget,
                    },
                    "responseMimeType": "application/json",
                    "responseSchema": GEMINI_RECOMMENDATION_SCHEMA,
                },
            },
            timeout=settings.ai_request_timeout_seconds,
        )
        response.raise_for_status()
        logger.info("Gemini responded with HTTP %s from %s", response.status_code, safe_url)
    except httpx.HTTPStatusError as error:
        response_text = error.response.text[:MAX_LOGGED_AI_BODY_LENGTH]
        logger.error(
            "Gemini returned HTTP %s from %s. Response body: %s",
            error.response.status_code,
            safe_url,
            response_text,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gemini devolvio HTTP {error.response.status_code}",
        ) from error
    except httpx.TimeoutException as error:
        logger.exception(
            "Gemini timed out after %ss from %s",
            settings.ai_request_timeout_seconds,
            safe_url,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gemini no respondio en {settings.ai_request_timeout_seconds} segundos",
        ) from error
    except httpx.RequestError as error:
        logger.exception("Gemini request failed before receiving a response from %s", safe_url)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de IA no esta disponible",
        ) from error

    return parse_gemini_response(response.json())


def build_recommendation_response(
    recommendation: Recomendacion,
    remaining: dict[str, float],
) -> RecommendationResponse:
    content = parse_recommendation_content(recommendation.resultado)
    return RecommendationResponse(
        id=recommendation.id,
        fecha=recommendation.fecha,
        prompt=recommendation.prompt,
        resultado=recommendation.resultado,
        contenido=content,
        calorias_restantes=remaining["calorias"],
        proteinas_restantes=remaining["proteinas"],
        carbohidratos_restantes=remaining["carbohidratos"],
        grasas_restantes=remaining["grasas"],
    )


def generate_recommendation(
    db: Session,
    user: Usuario,
    payload: RecommendationRequest,
    ai_client: AiClient | None = None,
) -> RecommendationResponse:
    targets = get_macro_targets(user)
    daily_log = get_daily_log(db, user, payload.fecha)
    remaining = calculate_remaining(daily_log, targets)
    user_prompt = (payload.prompt or "").strip()
    ai_prompt = build_ai_prompt(user, daily_log, targets, remaining, user_prompt)
    result = call_gemini(ai_prompt, ai_client)
    content = parse_recommendation_content(result)
    structured_result = content.model_dump_json()

    recommendation = Recomendacion(
        usuario=user,
        fecha=payload.fecha,
        prompt=user_prompt,
        resultado=structured_result,
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    return build_recommendation_response(recommendation, remaining)


def apply_recommendation_to_daily_log(
    db: Session,
    user: Usuario,
    recommendation_id: Any,
    payload: RecommendationApplyRequest,
) -> DailyLogResponse:
    meal_names = [meal_type.nombre for meal_type in ensure_default_meal_types(db, user)]
    if payload.tipo not in meal_names:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Tipo de comida no valido",
        )

    recommendation = db.scalar(
        select(Recomendacion).where(
            Recomendacion.id == recommendation_id,
            Recomendacion.usuario_id == user.id,
        )
    )
    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recomendacion no encontrada",
        )

    content = parse_recommendation_content(recommendation.resultado)
    meal = db.scalar(
        select(Comida).where(
            Comida.usuario_id == user.id,
            Comida.fecha == payload.fecha,
            Comida.tipo == payload.tipo,
        )
    )
    if meal is None:
        meal = Comida(usuario=user, fecha=payload.fecha, tipo=payload.tipo)
        db.add(meal)
        db.flush()

    for item in content.alimentos:
        factor = item.cantidad / 100
        food = Alimento(
            nombre=f"IA - {item.nombre}",
            calorias=round(item.calorias / factor, 2),
            proteinas=round(item.proteinas / factor, 2),
            carbohidratos=round(item.carbohidratos / factor, 2),
            grasas=round(item.grasas / factor, 2),
            unidad_base=item.unidad,
            codigo_qr=None,
        )
        db.add(food)
        db.flush()
        db.add(
            Registro(
                comida=meal,
                alimento=food,
                cantidad=item.cantidad,
                unidad=item.unidad,
            )
        )

    db.commit()
    return get_daily_log(db, user, payload.fecha)
