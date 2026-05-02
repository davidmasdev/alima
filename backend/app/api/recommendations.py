from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.daily_log import DailyLogResponse
from app.schemas.recommendations import (
    RecommendationApplyRequest,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.recommendations import apply_recommendation_to_daily_log, generate_recommendation


router = APIRouter()


@router.post("", response_model=RecommendationResponse, status_code=status.HTTP_201_CREATED)
def create_recommendation(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> RecommendationResponse:
    return generate_recommendation(db, current_user, payload)


@router.post(
    "/{recommendation_id}/add-to-meal",
    response_model=DailyLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_entries_from_recommendation(
    recommendation_id: UUID,
    payload: RecommendationApplyRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> DailyLogResponse:
    return apply_recommendation_to_daily_log(db, current_user, recommendation_id, payload)
