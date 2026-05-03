from fastapi import APIRouter, Depends, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.auth import (
    AuthMessageResponse,
    AuthTokenResponse,
    ResendVerificationRequest,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.schemas.auth import UserResponse
from app.services.auth import (
    build_frontend_verification_url,
    authenticate_user,
    register_user,
    resend_verification_email,
    verify_email_token,
)


router = APIRouter()


@router.post(
    "/register",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)) -> AuthMessageResponse:
    return register_user(db, payload)


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)) -> AuthTokenResponse:
    return authenticate_user(db, payload)


@router.get("/verify-email", include_in_schema=False)
def verify_email(token: str, db: Session = Depends(get_db)) -> RedirectResponse:
    result = verify_email_token(db, token)
    return RedirectResponse(build_frontend_verification_url(result), status_code=302)


@router.post("/resend-verification", response_model=AuthMessageResponse)
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
) -> AuthMessageResponse:
    return resend_verification_email(db, payload)


@router.get("/me", response_model=UserResponse)
def me(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    return current_user
