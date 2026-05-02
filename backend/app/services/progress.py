from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alimento import Alimento
from app.models.comida import Comida
from app.models.registro import Registro
from app.models.registro_peso import RegistroPeso
from app.models.usuario import Usuario
from app.schemas.profile import ProfileUpsertRequest
from app.schemas.progress import (
    ProgressDayResponse,
    ProgressResponse,
    ProgressSummaryResponse,
    WeightUpsertRequest,
    WeightPointResponse,
)
from app.services.profile import calculate_daily_calories


VALID_RANGES = {"week", "month", "total"}


def get_range_bounds(
    db: Session,
    user_id: UUID,
    range_name: str,
    anchor_date: date,
) -> tuple[date | None, date | None]:
    if range_name == "week":
        start_date = anchor_date - timedelta(days=anchor_date.weekday())
        return start_date, start_date + timedelta(days=6)

    if range_name == "month":
        start_date = anchor_date.replace(day=1)
        if start_date.month == 12:
            next_month = start_date.replace(year=start_date.year + 1, month=1)
        else:
            next_month = start_date.replace(month=start_date.month + 1)
        return start_date, next_month - timedelta(days=1)

    min_food_date = db.scalar(select(func.min(Comida.fecha)).where(Comida.usuario_id == user_id))
    min_weight_date = db.scalar(
        select(func.min(RegistroPeso.fecha)).where(RegistroPeso.usuario_id == user_id)
    )
    max_food_date = db.scalar(select(func.max(Comida.fecha)).where(Comida.usuario_id == user_id))
    max_weight_date = db.scalar(
        select(func.max(RegistroPeso.fecha)).where(RegistroPeso.usuario_id == user_id)
    )

    starts = [item for item in [min_food_date, min_weight_date] if item is not None]
    ends = [item for item in [max_food_date, max_weight_date] if item is not None]
    if not starts or not ends:
        return None, None
    return min(starts), max(ends)


def calculate_compliance(calories: float, goal: float | None, registered: bool) -> bool | None:
    if not registered:
        return None
    if goal is None:
        return False
    return goal * 0.9 <= calories <= goal * 1.1


def calculate_streak(days: list[ProgressDayResponse]) -> int:
    streak = 0
    for day in reversed(days):
        if day.cumplido is True:
            streak += 1
        elif day.registrado:
            break
    return streak


def get_calories_by_date(
    db: Session,
    user_id: UUID,
    start_date: date | None,
    end_date: date | None,
) -> dict[date, float]:
    calories_expression = func.sum(Alimento.calorias * Registro.cantidad / 100)
    statement = (
        select(Comida.fecha, calories_expression)
        .join(Registro, Registro.comida_id == Comida.id)
        .join(Alimento, Alimento.id == Registro.alimento_id)
        .where(Comida.usuario_id == user_id)
        .group_by(Comida.fecha)
        .order_by(Comida.fecha)
    )
    if start_date is not None:
        statement = statement.where(Comida.fecha >= start_date)
    if end_date is not None:
        statement = statement.where(Comida.fecha <= end_date)

    return {row[0]: round(float(row[1] or 0), 2) for row in db.execute(statement).all()}


def get_weight_series(
    db: Session,
    user_id: UUID,
    start_date: date | None,
    end_date: date | None,
) -> list[WeightPointResponse]:
    statement = (
        select(RegistroPeso)
        .where(RegistroPeso.usuario_id == user_id)
        .order_by(RegistroPeso.fecha)
    )
    if start_date is not None:
        statement = statement.where(RegistroPeso.fecha >= start_date)
    if end_date is not None:
        statement = statement.where(RegistroPeso.fecha <= end_date)

    return [
        WeightPointResponse(fecha=item.fecha, peso=item.peso)
        for item in db.scalars(statement).all()
    ]


def build_days(
    calories_by_date: dict[date, float],
    start_date: date | None,
    end_date: date | None,
    goal: float | None,
) -> list[ProgressDayResponse]:
    if start_date is None or end_date is None:
        return []

    days: list[ProgressDayResponse] = []
    current_date = start_date
    while current_date <= end_date:
        calories = calories_by_date.get(current_date, 0)
        registered = current_date in calories_by_date
        days.append(
            ProgressDayResponse(
                fecha=current_date,
                calorias=round(calories, 2),
                objetivo_calorias=goal,
                registrado=registered,
                cumplido=calculate_compliance(calories, goal, registered),
            )
        )
        current_date += timedelta(days=1)
    return days


def get_progress(
    db: Session,
    user: Usuario,
    range_name: str,
    anchor_date: date,
) -> ProgressResponse:
    if range_name not in VALID_RANGES:
        range_name = "week"

    start_date, end_date = get_range_bounds(db, user.id, range_name, anchor_date)
    goal = user.perfil_nutricional.calorias_diarias if user.perfil_nutricional else None
    calories_by_date = get_calories_by_date(db, user.id, start_date, end_date)
    weight_series = get_weight_series(db, user.id, start_date, end_date)
    days = build_days(calories_by_date, start_date, end_date, goal)
    registered_days = [day for day in days if day.registrado]
    completed_days = [day for day in registered_days if day.cumplido]

    summary = ProgressSummaryResponse(
        rango=range_name,
        fecha_inicio=start_date,
        fecha_fin=end_date,
        dias_registrados=len(registered_days),
        dias_cumplidos=len(completed_days),
        calorias_promedio=round(
            sum(day.calorias for day in registered_days) / len(registered_days),
            2,
        )
        if registered_days
        else 0,
        racha_actual=calculate_streak(days),
    )

    return ProgressResponse(
        range=range_name,
        objetivo_calorias=goal,
        summary=summary,
        days=days,
        calories_series=registered_days,
        weight_series=weight_series,
    )


def save_weight(
    db: Session,
    user: Usuario,
    payload: WeightUpsertRequest,
    range_name: str,
    anchor_date: date,
) -> ProgressResponse:
    target_date = payload.fecha or date.today()
    latest_weight_date = db.scalar(
        select(func.max(RegistroPeso.fecha)).where(RegistroPeso.usuario_id == user.id)
    )
    weight_record = db.scalar(
        select(RegistroPeso).where(
            RegistroPeso.usuario_id == user.id,
            RegistroPeso.fecha == target_date,
        )
    )

    if weight_record is None:
        db.add(RegistroPeso(usuario=user, fecha=target_date, peso=payload.peso))
    else:
        weight_record.peso = payload.peso

    should_update_profile = latest_weight_date is None or target_date >= latest_weight_date
    profile = user.perfil_nutricional
    if should_update_profile and profile is not None:
        profile.peso = payload.peso
        if user.nombre and user.fecha_nacimiento:
            profile.calorias_diarias = calculate_daily_calories(
                ProfileUpsertRequest(
                    nombre=user.nombre,
                    fecha_nacimiento=user.fecha_nacimiento,
                    sexo=profile.sexo,
                    nivel_actividad=profile.nivel_actividad,
                    objetivo=profile.objetivo,
                    peso=payload.peso,
                    altura=profile.altura,
                )
            )

    db.commit()
    db.refresh(user)
    return get_progress(db, user, range_name, anchor_date)
