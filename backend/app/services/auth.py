from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.usuario import Usuario
from app.schemas.auth import AuthTokenResponse, UserLoginRequest, UserRegisterRequest


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> Usuario | None:
    normalized_email = normalize_email(email)
    return db.scalar(select(Usuario).where(Usuario.email == normalized_email))


def register_user(db: Session, payload: UserRegisterRequest) -> AuthTokenResponse:
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
    db.commit()
    db.refresh(user)

    return AuthTokenResponse(access_token=create_access_token(user.id), user=user)


def authenticate_user(db: Session, payload: UserLoginRequest) -> AuthTokenResponse:
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    return AuthTokenResponse(access_token=create_access_token(user.id), user=user)
