from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.daily_log import MealTypeResponse, MealTypeUpdateRequest
from app.services.daily_log import list_meal_types, replace_meal_types


router = APIRouter()


@router.get("", response_model=list[MealTypeResponse])
def read_meal_types(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[MealTypeResponse]:
    return list_meal_types(db, current_user)


@router.put("", response_model=list[MealTypeResponse])
def update_meal_types(
    payload: MealTypeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[MealTypeResponse]:
    return replace_meal_types(db, current_user, payload.nombres)

