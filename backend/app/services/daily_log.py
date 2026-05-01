from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.alimento import Alimento
from app.models.comida import Comida
from app.models.registro import Registro
from app.models.tipo_comida_usuario import TipoComidaUsuario
from app.models.usuario import Usuario
from app.schemas.daily_log import (
    DailyEntryCreateRequest,
    DailyEntryResponse,
    DailyLogResponse,
    DailyTotalsResponse,
    FoodResponse,
    MealLogResponse,
    MealTypeResponse,
)


DEFAULT_MEAL_TYPES = ["Desayuno", "Comida", "Cena"]
VALID_UNITS = {"g", "ml"}


def ensure_default_meal_types(db: Session, user: Usuario) -> list[TipoComidaUsuario]:
    existing = list(user.tipos_comida)
    if existing:
        return sorted(existing, key=lambda item: item.orden)

    meal_types = [
        TipoComidaUsuario(usuario=user, nombre=name, orden=index)
        for index, name in enumerate(DEFAULT_MEAL_TYPES)
    ]
    db.add_all(meal_types)
    db.commit()
    db.refresh(user)
    return list(user.tipos_comida)


def list_meal_types(db: Session, user: Usuario) -> list[MealTypeResponse]:
    return [
        MealTypeResponse(id=meal_type.id, nombre=meal_type.nombre, orden=meal_type.orden)
        for meal_type in ensure_default_meal_types(db, user)
    ]


def replace_meal_types(db: Session, user: Usuario, nombres: list[str]) -> list[MealTypeResponse]:
    cleaned_names: list[str] = []
    for name in nombres:
        cleaned = name.strip()
        if cleaned and cleaned.lower() not in [item.lower() for item in cleaned_names]:
            cleaned_names.append(cleaned)

    if not cleaned_names:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Debes indicar al menos un tipo de comida",
        )

    for meal_type in list(user.tipos_comida):
        db.delete(meal_type)
    db.flush()

    for index, name in enumerate(cleaned_names):
        db.add(TipoComidaUsuario(usuario=user, nombre=name, orden=index))

    db.commit()
    db.refresh(user)
    return list_meal_types(db, user)


def search_foods(db: Session, query: str | None) -> list[FoodResponse]:
    statement = select(Alimento).order_by(Alimento.nombre).limit(20)
    if query:
        pattern = f"%{query.strip()}%"
        statement = (
            select(Alimento)
            .where(or_(Alimento.nombre.ilike(pattern), Alimento.codigo_qr == query.strip()))
            .order_by(func.length(Alimento.nombre), Alimento.nombre)
            .limit(20)
        )

    return [
        FoodResponse(
            id=food.id,
            nombre=food.nombre,
            calorias=food.calorias,
            proteinas=food.proteinas,
            carbohidratos=food.carbohidratos,
            grasas=food.grasas,
            unidad_base=food.unidad_base,
            codigo_qr=food.codigo_qr,
        )
        for food in db.scalars(statement).all()
    ]


def calculate_entry(food: Alimento, entry: Registro) -> DailyEntryResponse:
    factor = entry.cantidad / 100
    return DailyEntryResponse(
        id=entry.id,
        alimento_id=food.id,
        alimento_nombre=food.nombre,
        cantidad=entry.cantidad,
        unidad=entry.unidad,
        calorias=round(food.calorias * factor, 2),
        proteinas=round(food.proteinas * factor, 2),
        carbohidratos=round(food.carbohidratos * factor, 2),
        grasas=round(food.grasas * factor, 2),
    )


def get_daily_log(db: Session, user: Usuario, target_date: date) -> DailyLogResponse:
    meal_types = [meal_type.nombre for meal_type in ensure_default_meal_types(db, user)]
    meals_by_type = {
        meal_type: MealLogResponse(
            tipo=meal_type,
            calorias=0,
            proteinas=0,
            carbohidratos=0,
            grasas=0,
            entries=[],
        )
        for meal_type in meal_types
    }

    comidas = db.scalars(
        select(Comida)
        .where(Comida.usuario_id == user.id, Comida.fecha == target_date)
        .options(joinedload(Comida.registros).joinedload(Registro.alimento))
        .order_by(Comida.tipo)
    ).unique().all()

    totals = DailyTotalsResponse(calorias=0, proteinas=0, carbohidratos=0, grasas=0)

    for meal in comidas:
        if meal.tipo not in meals_by_type:
            meals_by_type[meal.tipo] = MealLogResponse(
                tipo=meal.tipo,
                calorias=0,
                proteinas=0,
                carbohidratos=0,
                grasas=0,
                entries=[],
            )
            meal_types.append(meal.tipo)

        meal_response = meals_by_type[meal.tipo]
        for entry in meal.registros:
            calculated = calculate_entry(entry.alimento, entry)
            meal_response.entries.append(calculated)
            meal_response.calorias += calculated.calorias
            meal_response.proteinas += calculated.proteinas
            meal_response.carbohidratos += calculated.carbohidratos
            meal_response.grasas += calculated.grasas
            totals.calorias += calculated.calorias
            totals.proteinas += calculated.proteinas
            totals.carbohidratos += calculated.carbohidratos
            totals.grasas += calculated.grasas

    for meal in meals_by_type.values():
        meal.calorias = round(meal.calorias, 2)
        meal.proteinas = round(meal.proteinas, 2)
        meal.carbohidratos = round(meal.carbohidratos, 2)
        meal.grasas = round(meal.grasas, 2)

    totals.calorias = round(totals.calorias, 2)
    totals.proteinas = round(totals.proteinas, 2)
    totals.carbohidratos = round(totals.carbohidratos, 2)
    totals.grasas = round(totals.grasas, 2)

    return DailyLogResponse(
        fecha=target_date,
        meal_types=meal_types,
        totals=totals,
        meals=list(meals_by_type.values()),
    )


def add_daily_entry(
    db: Session,
    user: Usuario,
    payload: DailyEntryCreateRequest,
) -> DailyEntryResponse:
    if payload.unidad not in VALID_UNITS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unidad no válida",
        )

    meal_names = [meal_type.nombre for meal_type in ensure_default_meal_types(db, user)]
    if payload.tipo not in meal_names:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Tipo de comida no válido",
        )

    food = db.get(Alimento, payload.alimento_id)
    if food is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alimento no encontrado")

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

    entry = Registro(
        comida=meal,
        alimento=food,
        cantidad=payload.cantidad,
        unidad=payload.unidad,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return calculate_entry(food, entry)


def delete_daily_entry(db: Session, user: Usuario, entry_id: UUID) -> None:
    entry = db.scalar(
        select(Registro)
        .join(Comida)
        .where(Registro.id == entry_id, Comida.usuario_id == user.id)
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado")

    db.delete(entry)
    db.commit()

