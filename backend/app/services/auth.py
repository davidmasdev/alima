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
from app.models.oauth_account import OAuthAccount
from app.models.password_reset_token import PasswordResetToken
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
from app.services.email import send_password_reset_email, send_verification_email


logger = logging.getLogger(__name__)
GENERIC_RESEND_MESSAGE = "Si existe una cuenta pendiente, enviaremos un nuevo correo"
REGISTER_MESSAGE = "Cuenta creada. Revisa tu correo para validarla"
PASSWORD_RESET_SENT_MESSAGE = "Te hemos enviado un enlace para restablecer tu contraseña"
PASSWORD_RESET_SUCCESS_MESSAGE = "Contraseña actualizada correctamente"
GOOGLE_PROVIDER = "google"
OAUTH_PASSWORD_PLACEHOLDER = "oauth:google"


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> Usuario | None:
    normalized_email = normalize_email(email)
    return db.scalar(select(Usuario).where(Usuario.email == normalized_email))


def get_oauth_account(
    db: Session,
    provider: str,
    provider_user_id: str,
) -> OAuthAccount | None:
    return db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id,
        )
    )


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_verification_url(token: str) -> str:
    settings = get_settings()
    return f"{settings.backend_public_url.rstrip('/')}/api/auth/verify-email?{urlencode({'token': token})}"


def build_frontend_verification_url(status_value: str) -> str:
    settings = get_settings()
    return f"{settings.frontend_public_url.rstrip('/')}/verify-email?{urlencode({'status': status_value})}"


def build_password_reset_url(token: str) -> str:
    settings = get_settings()
    return f"{settings.backend_public_url.rstrip('/')}/api/auth/password-reset?{urlencode({'token': token})}"


def build_frontend_password_reset_url(token: str) -> str:
    settings = get_settings()
    return f"{settings.frontend_public_url.rstrip('/')}/reset-password?{urlencode({'token': token})}"


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


def create_password_reset_token(db: Session, user: Usuario) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    raw_token = secrets.token_urlsafe(32)
    token = PasswordResetToken(
        usuario=user,
        token_hash=hash_verification_token(raw_token),
        created_at=now,
        expires_at=now + timedelta(minutes=settings.password_reset_expire_minutes),
        used_at=None,
    )
    db.add(token)
    return raw_token


def send_user_verification_email(user: Usuario, raw_token: str) -> None:
    try:
        send_verification_email(user.email, build_verification_url(raw_token))
    except Exception:
        logger.exception("Could not send verification email to %s", user.email)


def send_user_password_reset_email(user: Usuario, raw_token: str) -> None:
    try:
        send_password_reset_email(user.email, build_password_reset_url(raw_token))
    except Exception:
        logger.exception("Could not send password reset email to %s", user.email)


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


def request_password_reset(
    db: Session,
    payload: ForgotPasswordRequest,
) -> AuthMessageResponse:
    user = get_user_by_email(db, payload.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe una cuenta con ese correo",
        )

    now = datetime.now(timezone.utc)
    for token in user.password_reset_tokens:
        if token.used_at is None:
            token.used_at = now

    raw_token = create_password_reset_token(db, user)
    db.commit()
    send_user_password_reset_email(user, raw_token)
    return AuthMessageResponse(message=PASSWORD_RESET_SENT_MESSAGE, user=None)


def reset_password(db: Session, payload: ResetPasswordRequest) -> AuthMessageResponse:
    token_hash = hash_verification_token(payload.token)
    reset_token = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    now = datetime.now(timezone.utc)

    if reset_token is None or reset_token.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación no es válido",
        )

    if reset_token.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación ha caducado",
        )

    reset_token.usuario.contrasena_hash = hash_password(payload.password)
    reset_token.used_at = now
    db.commit()
    return AuthMessageResponse(message=PASSWORD_RESET_SUCCESS_MESSAGE, user=None)


def verify_google_id_token(raw_id_token: str) -> dict[str, object]:
    settings = get_settings()
    if not settings.google_oauth_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El inicio con Google no está configurado",
        )

    try:
        from google.auth.transport import requests
        from google.oauth2 import id_token

        return id_token.verify_oauth2_token(
            raw_id_token,
            requests.Request(),
            settings.google_oauth_client_id,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Could not validate Google OAuth token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar la sesión de Google",
        )


def authenticate_google_user(db: Session, payload: OAuthGoogleRequest) -> AuthTokenResponse:
    token_info = verify_google_id_token(payload.id_token)
    provider_user_id = str(token_info.get("sub") or "")
    email = normalize_email(str(token_info.get("email") or ""))
    email_verified = token_info.get("email_verified")
    display_name = token_info.get("name")

    if not provider_user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de Google no contiene los datos necesarios",
        )

    if email_verified is not True and str(email_verified).lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El correo de Google no está verificado",
        )

    oauth_account = get_oauth_account(db, GOOGLE_PROVIDER, provider_user_id)
    if oauth_account is not None:
        user = oauth_account.usuario
        if not user.validada:
            user.validada = True
            db.commit()
        return AuthTokenResponse(access_token=create_access_token(user.id), user=user)

    user = get_user_by_email(db, email)
    if user is None:
        user = Usuario(
            email=email,
            nombre=str(display_name).strip() if display_name else None,
            contrasena_hash=OAUTH_PASSWORD_PLACEHOLDER,
            validada=True,
        )
        db.add(user)
    else:
        user.validada = True

    db.add(
        OAuthAccount(
            usuario=user,
            provider=GOOGLE_PROVIDER,
            provider_user_id=provider_user_id,
            email=email,
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(user)
    return AuthTokenResponse(access_token=create_access_token(user.id), user=user)
