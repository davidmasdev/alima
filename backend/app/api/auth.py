from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.auth import AuthTokenResponse, UserLoginRequest, UserRegisterRequest
from app.schemas.auth import UserResponse
from app.services.auth import authenticate_user, register_user


router = APIRouter()


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)) -> AuthTokenResponse:
    return register_user(db, payload)


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)) -> AuthTokenResponse:
    return authenticate_user(db, payload)


@router.get("/me", response_model=UserResponse)
def me(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    return current_user

