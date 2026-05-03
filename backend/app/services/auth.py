import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.email_verification_token import EmailVerificationToken
from app.models.usuario import Usuario
from app.schemas.auth import (
    AuthMessageResponse,
    AuthTokenResponse,
    ResendVerificationRequest,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.services.email import send_verification_email


logger = logging.getLogger(__name__)
GENERIC_RESEND_MESSAGE = "Si existe una cuenta pendiente, enviaremos un nuevo correo"
REGISTER_MESSAGE = "Cuenta creada. Revisa tu correo para validarla"


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> Usuario | None:
    normalized_email = normalize_email(email)
    return db.scalar(select(Usuario).where(Usuario.email == normalized_email))


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_verification_url(token: str) -> str:
    settings = get_settings()
    return f"{settings.backend_public_url.rstrip('/')}/api/auth/verify-email?{urlencode({'token': token})}"


def build_frontend_verification_url(status_value: str) -> str:
    settings = get_settings()
    return f"{settings.frontend_public_url.rstrip('/')}/verify-email?{urlencode({'status': status_value})}"


def create_verification_token(db: Session, user: Usuario) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    raw_token = secrets.token_urlsafe(32)
    token = EmailVerificationToken(
        usuario=user,
        token_hash=hash_verification_token(raw_token),
        created_at=now,
        expires_at=now + timedelta(hours=settings.email_verification_expire_hours),
        used_at=None,
    )
    db.add(token)
    return raw_token


def send_user_verification_email(user: Usuario, raw_token: str) -> None:
    try:
        send_verification_email(user.email, build_verification_url(raw_token))
    except Exception:
        logger.exception("Could not send verification email to %s", user.email)


def register_user(db: Session, payload: UserRegisterRequest) -> AuthMessageResponse:
    email = normalize_email(payload.email)
    if get_user_by_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email",
        )

    user = Usuario(
        email=email,
        nombre=payload.nombre.strip() if payload.nombre else None,
        fecha_nacimiento=payload.fecha_nacimiento,
        contrasena_hash=hash_password(payload.password),
        validada=False,
    )
    db.add(user)
    raw_token = create_verification_token(db, user)
    db.commit()
    db.refresh(user)
    send_user_verification_email(user, raw_token)

    return AuthMessageResponse(message=REGISTER_MESSAGE, user=user)


def authenticate_user(db: Session, payload: UserLoginRequest) -> AuthTokenResponse:
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not user.validada:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Valida tu correo antes de iniciar sesión",
        )

    return AuthTokenResponse(access_token=create_access_token(user.id), user=user)


def verify_email_token(db: Session, raw_token: str) -> str:
    token_hash = hash_verification_token(raw_token)
    verification_token = db.scalar(
        select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
    )
    now = datetime.now(timezone.utc)

    if verification_token is None or verification_token.used_at is not None:
        return "invalid"

    if verification_token.expires_at < now:
        return "expired"

    verification_token.used_at = now
    verification_token.usuario.validada = True
    db.commit()
    return "success"


def resend_verification_email(
    db: Session,
    payload: ResendVerificationRequest,
) -> AuthMessageResponse:
    user = get_user_by_email(db, payload.email)
    if user is None or user.validada:
        return AuthMessageResponse(message=GENERIC_RESEND_MESSAGE, user=None)

    now = datetime.now(timezone.utc)
    for token in user.email_verification_tokens:
        if token.used_at is None:
            token.used_at = now

    raw_token = create_verification_token(db, user)
    db.commit()
    send_user_verification_email(user, raw_token)
    return AuthMessageResponse(message=GENERIC_RESEND_MESSAGE, user=None)
