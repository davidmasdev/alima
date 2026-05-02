from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.progress import ProgressResponse, WeightUpsertRequest
from app.services.progress import get_progress, save_weight


router = APIRouter()


@router.get("", response_model=ProgressResponse)
def read_progress(
    range: str = Query(default="week", pattern="^(week|month|total)$"),
    anchor_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> ProgressResponse:
    return get_progress(db, current_user, range, anchor_date)


@router.post("/weight", response_model=ProgressResponse)
def save_progress_weight(
    payload: WeightUpsertRequest,
    range: str = Query(default="week", pattern="^(week|month|total)$"),
    anchor_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> ProgressResponse:
    return save_weight(db, current_user, payload, range, anchor_date)
