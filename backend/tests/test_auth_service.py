from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.usuario import Usuario
from app.models.email_verification_token import EmailVerificationToken
from app.schemas.auth import UserLoginRequest, UserRegisterRequest
from app.services import auth


class FakeSession:
    def __init__(
        self,
        existing_user: Usuario | None = None,
        existing_token: EmailVerificationToken | None = None,
    ) -> None:
        self.existing_user = existing_user
        self.existing_token = existing_token
        self.added: list[object] = []
        self.committed = False

    def scalar(self, statement: object) -> Usuario | None:
        if self.existing_token is not None:
            return self.existing_token
        return self.existing_user

    def add(self, item: object) -> None:
        self.added.append(item)

    def commit(self) -> None:
        self.committed = True

    def refresh(self, item: object) -> None:
        item.id = uuid4()


def test_register_user_hashes_password_and_creates_verification_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(auth, "hash_password", lambda password: f"hashed:{password}")
    monkeypatch.setattr(auth, "send_user_verification_email", lambda user, raw_token: None)
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
    added_user = next(item for item in db.added if isinstance(item, Usuario))
    added_token = next(item for item in db.added if isinstance(item, EmailVerificationToken))
    assert added_user.email == "user@example.com"
    assert added_user.contrasena_hash == "hashed:password123"
    assert added_user.validada is False
    assert added_token.token_hash
    assert response.message == auth.REGISTER_MESSAGE
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
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=True)
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


def test_authenticate_user_rejects_unvalidated_account(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    db = FakeSession(existing_user=user)
    monkeypatch.setattr(auth, "verify_password", lambda password, password_hash: True)

    with pytest.raises(HTTPException) as error:
        auth.authenticate_user(
            db,
            UserLoginRequest(email="user@example.com", password="password123"),
        )

    assert error.value.status_code == 403


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


def test_verify_email_token_validates_user() -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    raw_token = "token-value"
    verification_token = EmailVerificationToken(
        usuario=user,
        token_hash=auth.hash_verification_token(raw_token),
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        used_at=None,
    )
    db = FakeSession(existing_token=verification_token)

    result = auth.verify_email_token(db, raw_token)

    assert result == "success"
    assert db.committed is True
    assert user.validada is True
    assert verification_token.used_at is not None


def test_verify_email_token_rejects_expired_token() -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    raw_token = "token-value"
    verification_token = EmailVerificationToken(
        usuario=user,
        token_hash=auth.hash_verification_token(raw_token),
        created_at=datetime.now(timezone.utc) - timedelta(hours=25),
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        used_at=None,
    )
    db = FakeSession(existing_token=verification_token)

    result = auth.verify_email_token(db, raw_token)

    assert result == "expired"
    assert user.validada is False


def test_verify_email_token_rejects_used_token() -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    raw_token = "token-value"
    verification_token = EmailVerificationToken(
        usuario=user,
        token_hash=auth.hash_verification_token(raw_token),
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        used_at=datetime.now(timezone.utc),
    )
    db = FakeSession(existing_token=verification_token)

    result = auth.verify_email_token(db, raw_token)

    assert result == "invalid"
