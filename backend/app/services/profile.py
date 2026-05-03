from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.perfil_nutricional import PerfilNutricional
from app.models.registro_peso import RegistroPeso
from app.models.usuario import Usuario
from app.schemas.profile import ProfileResponse, ProfileUpsertRequest


ACTIVITY_FACTORS: dict[str, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

GOAL_ADJUSTMENTS: dict[str, float] = {
    "maintain": 0,
    "lose": -500,
    "gain": 300,
}


def calculate_age(birth_date: date) -> int:
    today = date.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def validate_calorie_inputs(payload: ProfileUpsertRequest) -> int:
    age = calculate_age(payload.fecha_nacimiento)
    if age <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La fecha de nacimiento debe ser válida",
        )

    if payload.nivel_actividad not in ACTIVITY_FACTORS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Nivel de actividad no válido",
        )

    if payload.objetivo not in GOAL_ADJUSTMENTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Objetivo no válido",
        )

    return age


def calculate_basal_metabolic_rate(payload: ProfileUpsertRequest) -> float:
    age = validate_calorie_inputs(payload)
    if payload.sexo == "female":
        basal_metabolic_rate = 10 * payload.peso + 6.25 * payload.altura - 5 * age - 161
    else:
        basal_metabolic_rate = 10 * payload.peso + 6.25 * payload.altura - 5 * age + 5

    return round(basal_metabolic_rate, 2)


def calculate_total_daily_energy_expenditure(payload: ProfileUpsertRequest) -> float:
    basal_metabolic_rate = calculate_basal_metabolic_rate(payload)
    return round(basal_metabolic_rate * ACTIVITY_FACTORS[payload.nivel_actividad], 2)


def calculate_daily_calories(payload: ProfileUpsertRequest) -> float:
    calories = calculate_total_daily_energy_expenditure(payload)
    calories += GOAL_ADJUSTMENTS[payload.objetivo]
    return round(max(calories, 1200), 2)


def build_calculation_payload(user: Usuario) -> ProfileUpsertRequest | None:
    profile = user.perfil_nutricional
    if profile is None or user.nombre is None or user.fecha_nacimiento is None:
        return None

    return ProfileUpsertRequest(
        nombre=user.nombre,
        fecha_nacimiento=user.fecha_nacimiento,
        sexo=profile.sexo,
        nivel_actividad=profile.nivel_actividad,
        objetivo=profile.objetivo,
        peso=profile.peso,
        altura=profile.altura,
    )


def build_profile_response(user: Usuario) -> ProfileResponse:
    profile = user.perfil_nutricional
    calculation_payload = build_calculation_payload(user)
    basal_metabolic_rate = (
        calculate_basal_metabolic_rate(calculation_payload)
        if calculation_payload
        else None
    )
    total_daily_energy_expenditure = (
        calculate_total_daily_energy_expenditure(calculation_payload)
        if calculation_payload
        else None
    )
    return ProfileResponse(
        email=user.email,
        nombre=user.nombre,
        fecha_nacimiento=user.fecha_nacimiento,
        sexo=profile.sexo if profile else None,
        nivel_actividad=profile.nivel_actividad if profile else None,
        objetivo=profile.objetivo if profile else None,
        peso=profile.peso if profile else None,
        altura=profile.altura if profile else None,
        tmb=basal_metabolic_rate,
        get=total_daily_energy_expenditure,
        calorias_diarias=profile.calorias_diarias if profile else None,
    )


def get_profile(user: Usuario) -> ProfileResponse:
    return build_profile_response(user)


def upsert_profile(
    db: Session,
    user: Usuario,
    payload: ProfileUpsertRequest,
) -> ProfileResponse:
    user.nombre = payload.nombre.strip()
    user.fecha_nacimiento = payload.fecha_nacimiento

    profile = user.perfil_nutricional
    if profile is None:
        profile = PerfilNutricional(usuario=user)
        db.add(profile)

    profile.peso = payload.peso
    profile.altura = payload.altura
    profile.sexo = payload.sexo
    profile.nivel_actividad = payload.nivel_actividad
    profile.objetivo = payload.objetivo
    profile.calorias_diarias = calculate_daily_calories(payload)

    if hasattr(db, "scalar"):
        today = date.today()
        weight_record = db.scalar(
            select(RegistroPeso).where(
                RegistroPeso.usuario_id == user.id,
                RegistroPeso.fecha == today,
            )
        )
        if weight_record is None:
            db.add(RegistroPeso(usuario=user, fecha=today, peso=payload.peso))
        else:
            weight_record.peso = payload.peso

    db.add(user)
    db.commit()
    db.refresh(user)
    return build_profile_response(user)


def delete_account(db: Session, user: Usuario) -> None:
    db.delete(user)
    db.commit()
