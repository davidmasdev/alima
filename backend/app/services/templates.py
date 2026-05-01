from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.alimento import Alimento
from app.models.comida import Comida
from app.models.plantilla import Plantilla
from app.models.registro import Registro
from app.models.registro_plantilla import RegistroPlantilla
from app.models.usuario import Usuario
from app.schemas.daily_log import DailyLogResponse
from app.schemas.templates import (
    TemplateCreateRequest,
    TemplateItemPayload,
    TemplateItemResponse,
    TemplateResponse,
    TemplateUpdateRequest,
)
from app.services.daily_log import VALID_UNITS, ensure_default_meal_types, get_daily_log


def _calculate_values(food: Alimento, cantidad: float) -> tuple[float, float, float, float]:
    factor = cantidad / 100
    return (
        round(food.calorias * factor, 2),
        round(food.proteinas * factor, 2),
        round(food.carbohidratos * factor, 2),
        round(food.grasas * factor, 2),
    )


def _template_to_response(template: Plantilla) -> TemplateResponse:
    items: list[TemplateItemResponse] = []
    totals = {"calorias": 0.0, "proteinas": 0.0, "carbohidratos": 0.0, "grasas": 0.0}

    for item in template.registros:
        calorias, proteinas, carbohidratos, grasas = _calculate_values(
            item.alimento,
            item.cantidad,
        )
        totals["calorias"] += calorias
        totals["proteinas"] += proteinas
        totals["carbohidratos"] += carbohidratos
        totals["grasas"] += grasas
        items.append(
            TemplateItemResponse(
                id=item.id,
                alimento_id=item.alimento_id,
                alimento_nombre=item.alimento.nombre,
                cantidad=item.cantidad,
                unidad=item.unidad,
                calorias=calorias,
                proteinas=proteinas,
                carbohidratos=carbohidratos,
                grasas=grasas,
            )
        )

    return TemplateResponse(
        id=template.id,
        nombre=template.nombre,
        calorias=round(totals["calorias"], 2),
        proteinas=round(totals["proteinas"], 2),
        carbohidratos=round(totals["carbohidratos"], 2),
        grasas=round(totals["grasas"], 2),
        ultimo_uso=template.ultimo_uso,
        items=items,
    )


def _get_template_or_404(db: Session, user: Usuario, template_id: UUID) -> Plantilla:
    template = db.scalar(
        select(Plantilla)
        .where(Plantilla.id == template_id, Plantilla.usuario_id == user.id)
        .options(joinedload(Plantilla.registros).joinedload(RegistroPlantilla.alimento))
    )
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada")
    return template


def _get_foods_by_id(db: Session, items: list[TemplateItemPayload]) -> dict[UUID, Alimento]:
    food_ids = {item.alimento_id for item in items}
    foods = {
        food.id: food
        for food in db.scalars(select(Alimento).where(Alimento.id.in_(food_ids))).all()
    }
    if len(foods) != len(food_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alimento no encontrado")
    return foods


def _clean_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El nombre de la plantilla es obligatorio",
        )
    return cleaned


def _replace_template_items(
    db: Session,
    template: Plantilla,
    items: list[TemplateItemPayload],
) -> None:
    foods = _get_foods_by_id(db, items)
    for item in list(template.registros):
        db.delete(item)
    db.flush()

    total_calories = 0.0
    for item in items:
        if item.unidad not in VALID_UNITS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Unidad no valida",
            )
        food = foods[item.alimento_id]
        total_calories += _calculate_values(food, item.cantidad)[0]
        db.add(
            RegistroPlantilla(
                plantilla=template,
                alimento=food,
                cantidad=item.cantidad,
                unidad=item.unidad,
            )
        )

    template.calorias = round(total_calories, 2)


def list_templates(db: Session, user: Usuario, sort: str = "name") -> list[TemplateResponse]:
    statement = (
        select(Plantilla)
        .where(Plantilla.usuario_id == user.id)
        .options(joinedload(Plantilla.registros).joinedload(RegistroPlantilla.alimento))
    )
    if sort == "recent":
        statement = statement.order_by(Plantilla.ultimo_uso.desc().nullslast(), Plantilla.nombre)
    else:
        statement = statement.order_by(Plantilla.nombre)

    return [_template_to_response(template) for template in db.scalars(statement).unique().all()]


def get_template(db: Session, user: Usuario, template_id: UUID) -> TemplateResponse:
    return _template_to_response(_get_template_or_404(db, user, template_id))


def create_template(
    db: Session,
    user: Usuario,
    payload: TemplateCreateRequest,
) -> TemplateResponse:
    template = Plantilla(usuario=user, nombre=_clean_name(payload.nombre), calorias=0)
    db.add(template)
    db.flush()
    _replace_template_items(db, template, payload.items)
    db.commit()
    db.refresh(template)
    return get_template(db, user, template.id)


def update_template(
    db: Session,
    user: Usuario,
    template_id: UUID,
    payload: TemplateUpdateRequest,
) -> TemplateResponse:
    template = _get_template_or_404(db, user, template_id)
    template.nombre = _clean_name(payload.nombre)
    _replace_template_items(db, template, payload.items)
    db.commit()
    return get_template(db, user, template.id)


def delete_template(db: Session, user: Usuario, template_id: UUID) -> None:
    template = db.scalar(
        select(Plantilla).where(Plantilla.id == template_id, Plantilla.usuario_id == user.id)
    )
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada")
    db.delete(template)
    db.commit()


def apply_template_to_daily_log(
    db: Session,
    user: Usuario,
    template_id: UUID,
    target_date,
    meal_type: str,
) -> DailyLogResponse:
    template = _get_template_or_404(db, user, template_id)
    if not template.registros:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La plantilla no tiene alimentos",
        )

    meal_names = [meal_type_item.nombre for meal_type_item in ensure_default_meal_types(db, user)]
    if meal_type not in meal_names:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Tipo de comida no valido",
        )

    meal = db.scalar(
        select(Comida).where(
            Comida.usuario_id == user.id,
            Comida.fecha == target_date,
            Comida.tipo == meal_type,
        )
    )
    if meal is None:
        meal = Comida(usuario=user, fecha=target_date, tipo=meal_type)
        db.add(meal)
        db.flush()

    for item in template.registros:
        db.add(
            Registro(
                comida=meal,
                alimento=item.alimento,
                cantidad=item.cantidad,
                unidad=item.unidad,
            )
        )

    template.ultimo_uso = datetime.now(timezone.utc)
    db.commit()
    return get_daily_log(db, user, target_date)
