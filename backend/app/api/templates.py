from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.templates import TemplateCreateRequest, TemplateResponse, TemplateUpdateRequest
from app.services.templates import (
    create_template,
    delete_template,
    get_template,
    list_templates,
    update_template,
)


router = APIRouter()


@router.get("", response_model=list[TemplateResponse])
def read_templates(
    sort: str = Query(default="name", pattern="^(name|recent)$"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[TemplateResponse]:
    return list_templates(db, current_user, sort)


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_user_template(
    payload: TemplateCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> TemplateResponse:
    return create_template(db, current_user, payload)


@router.get("/{template_id}", response_model=TemplateResponse)
def read_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> TemplateResponse:
    return get_template(db, current_user, template_id)


@router.put("/{template_id}", response_model=TemplateResponse)
def update_user_template(
    template_id: UUID,
    payload: TemplateUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> TemplateResponse:
    return update_template(db, current_user, template_id, payload)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> None:
    delete_template(db, current_user, template_id)
