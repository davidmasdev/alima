from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.daily_log import (
    DailyEntryCreateRequest,
    DailyEntryResponse,
    DailyLogResponse,
    DailyTemplateApplyRequest,
)
from app.services.daily_log import add_daily_entry, delete_daily_entry, get_daily_log
from app.services.templates import apply_template_to_daily_log


router = APIRouter()


@router.get("", response_model=DailyLogResponse)
def read_daily_log(
    date: date,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> DailyLogResponse:
    return get_daily_log(db, current_user, date)


@router.post("/entries", response_model=DailyEntryResponse, status_code=status.HTTP_201_CREATED)
def create_daily_entry(
    payload: DailyEntryCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> DailyEntryResponse:
    return add_daily_entry(db, current_user, payload)


@router.post("/from-template", response_model=DailyLogResponse, status_code=status.HTTP_201_CREATED)
def create_daily_entries_from_template(
    payload: DailyTemplateApplyRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> DailyLogResponse:
    return apply_template_to_daily_log(
        db,
        current_user,
        payload.template_id,
        payload.fecha,
        payload.tipo,
    )


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_daily_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> None:
    delete_daily_entry(db, current_user, entry_id)
