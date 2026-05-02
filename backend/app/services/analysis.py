import json
import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.analisis import Analisis
from app.models.comida import Comida
from app.models.registro import Registro
from app.models.usuario import Usuario
from app.schemas.analysis import AnalysisContent, AnalysisRequest, AnalysisResponse
from app.services.recommendations import (
    AiClient,
    MAX_LOGGED_AI_BODY_LENGTH,
    call_gemini,
)


logger = logging.getLogger(__name__)
ANALYSIS_DAYS = 7
MIN_HISTORY_DAYS = 3

GEMINI_ANALYSIS_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "puntuacion": {"type": "NUMBER"},
        "estado_proteinas": {"type": "STRING"},
        "estado_carbohidratos": {"type": "STRING"},
        "estado_grasas": {"type": "STRING"},
        "estado_micronutrientes": {"type": "STRING"},
        "consejo": {"type": "STRING"},
    },
    "required": [
        "puntuacion",
        "estado_proteinas",
        "estado_carbohidratos",
        "estado_grasas",
        "estado_micronutrientes",
        "consejo",
    ],
    "propertyOrdering": [
        "puntuacion",
        "estado_proteinas",
        "estado_carbohidratos",
        "estado_grasas",
        "estado_micronutrientes",
        "consejo",
    ],
}


@dataclass
class DailyAnalysisSummary:
    fecha: date
    calorias: float
    proteinas: float
    carbohidratos: float
    grasas: float
    alimentos: list[str]


def collect_recent_history(
    db: Session,
    user: Usuario,
    end_date: date,
    days: int = ANALYSIS_DAYS,
) -> list[DailyAnalysisSummary]:
    start_date = end_date - timedelta(days=days - 1)
    meals = db.scalars(
        select(Comida)
        .where(
            Comida.usuario_id == user.id,
            Comida.fecha >= start_date,
            Comida.fecha <= end_date,
        )
        .options(joinedload(Comida.registros).joinedload(Registro.alimento))
        .order_by(Comida.fecha, Comida.tipo)
    ).unique().all()

    summaries_by_date: dict[date, DailyAnalysisSummary] = {}
    for meal in meals:
        summary = summaries_by_date.setdefault(
            meal.fecha,
            DailyAnalysisSummary(
                fecha=meal.fecha,
                calorias=0,
                proteinas=0,
                carbohidratos=0,
                grasas=0,
                alimentos=[],
            ),
        )
        for entry in meal.registros:
            factor = entry.cantidad / 100
            summary.calorias += entry.alimento.calorias * factor
            summary.proteinas += entry.alimento.proteinas * factor
            summary.carbohidratos += entry.alimento.carbohidratos * factor
            summary.grasas += entry.alimento.grasas * factor
            summary.alimentos.append(f"{entry.alimento.nombre} ({entry.cantidad}{entry.unidad})")

    return [
        DailyAnalysisSummary(
            fecha=summary.fecha,
            calorias=round(summary.calorias, 2),
            proteinas=round(summary.proteinas, 2),
            carbohidratos=round(summary.carbohidratos, 2),
            grasas=round(summary.grasas, 2),
            alimentos=summary.alimentos,
        )
        for summary in summaries_by_date.values()
        if summary.alimentos
    ]


def build_analysis_prompt(
    user: Usuario,
    history: list[DailyAnalysisSummary],
    end_date: date,
) -> str:
    profile = user.perfil_nutricional
    daily_lines = []
    for day in history:
        foods = ", ".join(day.alimentos[:12])
        daily_lines.append(
            (
                f"- {day.fecha}: {day.calorias} kcal, {day.proteinas}g proteinas, "
                f"{day.carbohidratos}g carbohidratos, {day.grasas}g grasas. "
                f"Alimentos: {foods}"
            )
        )

    return f"""
Eres un nutricionista. Analiza la dieta reciente del usuario y detecta carencias o desbalances.

Periodo analizado: ultimos {ANALYSIS_DAYS} dias hasta {end_date}.
Perfil:
- Objetivo: {profile.objetivo if profile else "desconocido"}
- Calorias objetivo: {profile.calorias_diarias if profile else "desconocido"} kcal
- Peso: {profile.peso if profile else "desconocido"} kg

Historial:
{chr(10).join(daily_lines)}

Devuelve solo JSON conforme al esquema de la API.
La puntuacion debe estar entre 0 y 100.
Estados recomendados: "OK", "Necesitas mas", "Bajar cantidad", "Mejorar variedad" o frases igual de cortas.
Micronutrientes debe estimarse por variedad de alimentos, frutas, verduras y fuentes proteicas.
El consejo debe ser una conclusion natural de maximo 2 frases.
""".strip()


def parse_analysis_content(raw_result: str) -> AnalysisContent:
    cleaned = raw_result.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        payload = json.loads(cleaned)
        return AnalysisContent.model_validate(payload)
    except (json.JSONDecodeError, ValueError) as error:
        logger.exception(
            "AI analysis could not be parsed as structured JSON. Raw result: %s",
            cleaned[:MAX_LOGGED_AI_BODY_LENGTH],
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La IA no devolvio un analisis estructurado valido",
        ) from error


def generate_diet_analysis(
    db: Session,
    user: Usuario,
    payload: AnalysisRequest,
    ai_client: AiClient | None = None,
) -> AnalysisResponse:
    history = collect_recent_history(db, user, payload.fecha)
    if len(history) < MIN_HISTORY_DAYS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Necesitas al menos {MIN_HISTORY_DAYS} dias con comidas registradas",
        )

    prompt = build_analysis_prompt(user, history, payload.fecha)
    raw_result = call_gemini(prompt, ai_client, GEMINI_ANALYSIS_SCHEMA)
    content = parse_analysis_content(raw_result)

    analysis = Analisis(
        usuario=user,
        fecha=payload.fecha,
        puntuacion=round(content.puntuacion, 2),
        estado_proteinas=content.estado_proteinas,
        estado_carbohidratos=content.estado_carbohidratos,
        estado_grasas=content.estado_grasas,
        estado_micronutrientes=content.estado_micronutrientes,
        consejo=content.consejo,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return AnalysisResponse(
        id=analysis.id,
        fecha=analysis.fecha,
        puntuacion=analysis.puntuacion,
        estado_proteinas=analysis.estado_proteinas,
        estado_carbohidratos=analysis.estado_carbohidratos,
        estado_grasas=analysis.estado_grasas,
        estado_micronutrientes=analysis.estado_micronutrientes,
        consejo=analysis.consejo,
        dias_analizados=len(history),
    )
