from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.email_verification_token import EmailVerificationToken
from app.models.oauth_account import OAuthAccount
from app.models.password_reset_token import PasswordResetToken
from app.models.usuario import Usuario
from app.schemas.auth import (
    ForgotPasswordRequest,
    OAuthGoogleRequest,
    ResetPasswordRequest,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.services import auth


class FakeSession:
    def __init__(
        self,
        existing_user: Usuario | None = None,
        existing_token: EmailVerificationToken | PasswordResetToken | OAuthAccount | None = None,
        scalar_results: list[object | None] | None = None,
    ) -> None:
        self.existing_user = existing_user
        self.existing_token = existing_token
        self.scalar_results = scalar_results
        self.added: list[object] = []
        self.committed = False

    def scalar(self, statement: object) -> object | None:
        if self.scalar_results is not None:
            return self.scalar_results.pop(0)
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


def test_request_password_reset_rejects_unknown_email() -> None:
    db = FakeSession()

    with pytest.raises(HTTPException) as error:
        auth.request_password_reset(
            db,
            ForgotPasswordRequest(email="missing@example.com"),
        )

    assert error.value.status_code == 404


def test_request_password_reset_creates_token_and_invalidates_previous(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=True)
    previous_token = PasswordResetToken(
        usuario=user,
        token_hash="previous",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        used_at=None,
    )
    user.password_reset_tokens = [previous_token]
    db = FakeSession(existing_user=user)
    monkeypatch.setattr(auth, "send_user_password_reset_email", lambda user, raw_token: None)

    response = auth.request_password_reset(
        db,
        ForgotPasswordRequest(email="user@example.com"),
    )

    added_token = next(item for item in db.added if isinstance(item, PasswordResetToken))
    assert response.message == auth.PASSWORD_RESET_SENT_MESSAGE
    assert previous_token.used_at is not None
    assert added_token.token_hash
    assert added_token.used_at is None
    assert db.committed is True


def test_reset_password_updates_hash_and_consumes_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = Usuario(email="user@example.com", contrasena_hash="old-hash", validada=True)
    raw_token = "reset-token"
    reset_token = PasswordResetToken(
        usuario=user,
        token_hash=auth.hash_verification_token(raw_token),
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        used_at=None,
    )
    db = FakeSession(existing_token=reset_token)
    monkeypatch.setattr(auth, "hash_password", lambda password: f"hashed:{password}")

    response = auth.reset_password(
        db,
        ResetPasswordRequest(token=raw_token, password="new-password"),
    )

    assert response.message == auth.PASSWORD_RESET_SUCCESS_MESSAGE
    assert user.contrasena_hash == "hashed:new-password"
    assert reset_token.used_at is not None
    assert db.committed is True


def test_reset_password_rejects_expired_token() -> None:
    user = Usuario(email="user@example.com", contrasena_hash="old-hash", validada=True)
    raw_token = "reset-token"
    reset_token = PasswordResetToken(
        usuario=user,
        token_hash=auth.hash_verification_token(raw_token),
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        used_at=None,
    )
    db = FakeSession(existing_token=reset_token)

    with pytest.raises(HTTPException) as error:
        auth.reset_password(
            db,
            ResetPasswordRequest(token=raw_token, password="new-password"),
        )

    assert error.value.status_code == 400
    assert user.contrasena_hash == "old-hash"


def test_reset_password_rejects_used_token() -> None:
    user = Usuario(email="user@example.com", contrasena_hash="old-hash", validada=True)
    raw_token = "reset-token"
    reset_token = PasswordResetToken(
        usuario=user,
        token_hash=auth.hash_verification_token(raw_token),
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        used_at=datetime.now(timezone.utc),
    )
    db = FakeSession(existing_token=reset_token)

    with pytest.raises(HTTPException) as error:
        auth.reset_password(
            db,
            ResetPasswordRequest(token=raw_token, password="new-password"),
        )

    assert error.value.status_code == 400
    assert user.contrasena_hash == "old-hash"


def test_google_oauth_creates_validated_user_and_account(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeSession(scalar_results=[None, None])
    monkeypatch.setattr(
        auth,
        "verify_google_id_token",
        lambda raw_token: {
            "sub": "google-user-id",
            "email": "USER@example.com",
            "email_verified": True,
            "name": "Google User",
        },
    )
    monkeypatch.setattr(auth, "create_access_token", lambda user_id: f"token:{user_id}")

    response = auth.authenticate_google_user(
        db,
        OAuthGoogleRequest(id_token="google-token"),
    )

    added_user = next(item for item in db.added if isinstance(item, Usuario))
    added_account = next(item for item in db.added if isinstance(item, OAuthAccount))
    assert added_user.email == "user@example.com"
    assert added_user.nombre == "Google User"
    assert added_user.validada is True
    assert added_user.contrasena_hash == auth.OAUTH_PASSWORD_PLACEHOLDER
    assert added_account.provider == auth.GOOGLE_PROVIDER
    assert added_account.provider_user_id == "google-user-id"
    assert response.access_token == f"token:{added_user.id}"


def test_google_oauth_links_existing_email(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=False)
    user.id = uuid4()
    db = FakeSession(scalar_results=[None, user])
    monkeypatch.setattr(
        auth,
        "verify_google_id_token",
        lambda raw_token: {
            "sub": "google-user-id",
            "email": "user@example.com",
            "email_verified": True,
        },
    )
    monkeypatch.setattr(auth, "create_access_token", lambda user_id: f"token:{user_id}")

    response = auth.authenticate_google_user(
        db,
        OAuthGoogleRequest(id_token="google-token"),
    )

    added_account = next(item for item in db.added if isinstance(item, OAuthAccount))
    assert user.validada is True
    assert added_account.usuario is user
    assert response.access_token == f"token:{user.id}"


def test_google_oauth_uses_existing_oauth_account(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = Usuario(email="user@example.com", contrasena_hash="hash", validada=True)
    user.id = uuid4()
    oauth_account = OAuthAccount(
        usuario=user,
        provider=auth.GOOGLE_PROVIDER,
        provider_user_id="google-user-id",
        email="user@example.com",
        created_at=datetime.now(timezone.utc),
    )
    db = FakeSession(scalar_results=[oauth_account])
    monkeypatch.setattr(
        auth,
        "verify_google_id_token",
        lambda raw_token: {
            "sub": "google-user-id",
            "email": "user@example.com",
            "email_verified": True,
        },
    )
    monkeypatch.setattr(auth, "create_access_token", lambda user_id: f"token:{user_id}")

    response = auth.authenticate_google_user(
        db,
        OAuthGoogleRequest(id_token="google-token"),
    )

    assert db.added == []
    assert response.access_token == f"token:{user.id}"


def test_google_oauth_rejects_unverified_email(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeSession()
    monkeypatch.setattr(
        auth,
        "verify_google_id_token",
        lambda raw_token: {
            "sub": "google-user-id",
            "email": "user@example.com",
            "email_verified": False,
        },
    )

    with pytest.raises(HTTPException) as error:
        auth.authenticate_google_user(
            db,
            OAuthGoogleRequest(id_token="google-token"),
        )

    assert error.value.status_code == 403
