from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.profile import ProfileResponse, ProfileUpsertRequest
from app.services.profile import delete_account, get_profile, upsert_profile


router = APIRouter()


@router.get("", response_model=ProfileResponse)
def read_profile(current_user: Usuario = Depends(get_current_user)) -> ProfileResponse:
    return get_profile(current_user)


@router.put("", response_model=ProfileResponse)
def save_profile(
    payload: ProfileUpsertRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> ProfileResponse:
    return upsert_profile(db, current_user, payload)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def remove_account(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> None:
    delete_account(db, current_user)

