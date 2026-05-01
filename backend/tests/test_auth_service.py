from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.usuario import Usuario
from app.schemas.auth import UserLoginRequest, UserRegisterRequest
from app.services import auth


class FakeSession:
    def __init__(self, existing_user: Usuario | None = None) -> None:
        self.existing_user = existing_user
        self.added_user: Usuario | None = None
        self.committed = False

    def scalar(self, statement: object) -> Usuario | None:
        return self.existing_user

    def add(self, user: Usuario) -> None:
        self.added_user = user

    def commit(self) -> None:
        self.committed = True

    def refresh(self, user: Usuario) -> None:
        user.id = uuid4()


def test_register_user_hashes_password_and_returns_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth, "hash_password", lambda password: f"hashed:{password}")
    monkeypatch.setattr(auth, "create_access_token", lambda user_id: f"token:{user_id}")
    db = FakeSession()

    response = auth.register_user(
        db,
        UserRegisterRequest(
            email="USER@Example.com",
            password="password123",
            nombre=" User ",
            fecha_nacimiento=date(2000, 1, 1),
        ),
    )

    assert db.committed is True
    assert db.added_user is not None
    assert db.added_user.email == "user@example.com"
    assert db.added_user.contrasena_hash == "hashed:password123"
    assert response.access_token.startswith("token:")
    assert response.user.email == "user@example.com"


def test_register_user_rejects_duplicate_email() -> None:
    db = FakeSession(
        existing_user=Usuario(email="user@example.com", contrasena_hash="hash", validada=False),
    )

    with pytest.raises(HTTPException) as error:
        auth.register_user(
            db,
            UserRegisterRequest(email="user@example.com", password="password123"),
        )

    assert error.value.status_code == 409


def test_authenticate_user_returns_token_for_valid_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    user.id = uuid4()
    db = FakeSession(existing_user=user)
    monkeypatch.setattr(auth, "verify_password", lambda password, password_hash: True)
    monkeypatch.setattr(auth, "create_access_token", lambda user_id: f"token:{user_id}")

    response = auth.authenticate_user(
        db,
        UserLoginRequest(email="user@example.com", password="password123"),
    )

    assert response.access_token == f"token:{user.id}"
    assert response.user.email == "user@example.com"


def test_authenticate_user_rejects_invalid_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    db = FakeSession(existing_user=user)
    monkeypatch.setattr(auth, "verify_password", lambda password, password_hash: False)

    with pytest.raises(HTTPException) as error:
        auth.authenticate_user(
            db,
            UserLoginRequest(email="user@example.com", password="wrong-password"),
        )

    assert error.value.status_code == 401
