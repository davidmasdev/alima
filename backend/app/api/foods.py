from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.daily_log import FoodResponse
from app.services.daily_log import search_foods


router = APIRouter()


@router.get("", response_model=list[FoodResponse])
def list_foods(
    query: str | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[FoodResponse]:
    return search_foods(db, query)

