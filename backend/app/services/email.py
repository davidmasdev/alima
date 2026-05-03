import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


logger = logging.getLogger(__name__)


def is_smtp_configured() -> bool:
    settings = get_settings()
    return bool(settings.smtp_host and settings.smtp_from_email)


def send_email(to_email: str, subject: str, body: str) -> None:
    settings = get_settings()

    if not is_smtp_configured():
        logger.warning(
            "SMTP is not configured. Email to %s with subject %s:\n%s",
            to_email,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def send_verification_email(to_email: str, verification_url: str) -> None:
    settings = get_settings()
    subject = "Valida tu cuenta de Alima"
    body = (
        "Gracias por registrarte en Alima.\n\n"
        "Valida tu cuenta pulsando este enlace:\n"
        f"{verification_url}\n\n"
        f"Este enlace caduca en {settings.email_verification_expire_hours} horas."
    )
    send_email(to_email, subject, body)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    settings = get_settings()
    subject = "Restablece tu contraseña de Alima"
    body = (
        "Hemos recibido una solicitud para restablecer tu contraseña.\n\n"
        "Puedes elegir una nueva contraseña desde este enlace:\n"
        f"{reset_url}\n\n"
        f"Este enlace caduca en {settings.password_reset_expire_minutes} minutos. "
        "Si no has solicitado este cambio, puedes ignorar este correo."
    )
    send_email(to_email, subject, body)
