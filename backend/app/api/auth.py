from fastapi import APIRouter, Depends, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.auth import (
    AuthMessageResponse,
    AuthTokenResponse,
    ForgotPasswordRequest,
    OAuthGoogleRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.schemas.auth import UserResponse
from app.services.auth import (
    authenticate_user,
    authenticate_google_user,
    build_frontend_password_reset_url,
    build_frontend_verification_url,
    register_user,
    request_password_reset,
    resend_verification_email,
    reset_password,
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


@router.post("/oauth/google", response_model=AuthTokenResponse)
def google_oauth_login(
    payload: OAuthGoogleRequest,
    db: Session = Depends(get_db),
) -> AuthTokenResponse:
    return authenticate_google_user(db, payload)


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


@router.post("/forgot-password", response_model=AuthMessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> AuthMessageResponse:
    return request_password_reset(db, payload)


@router.get("/password-reset", include_in_schema=False)
def password_reset(token: str) -> RedirectResponse:
    return RedirectResponse(build_frontend_password_reset_url(token), status_code=302)


@router.post("/reset-password", response_model=AuthMessageResponse)
def reset_user_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> AuthMessageResponse:
    return reset_password(db, payload)


@router.get("/me", response_model=UserResponse)
def me(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    return current_user
