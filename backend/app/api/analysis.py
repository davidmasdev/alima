from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis import generate_diet_analysis


router = APIRouter()


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
def create_analysis(
    payload: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> AnalysisResponse:
    return generate_diet_analysis(db, current_user, payload)
