import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


logger = logging.getLogger(__name__)


def is_smtp_configured() -> bool:
    settings = get_settings()
    return bool(settings.smtp_host and settings.smtp_from_email)


def send_verification_email(to_email: str, verification_url: str) -> None:
    settings = get_settings()
    subject = "Valida tu cuenta de Alima"
    body = (
        "Gracias por registrarte en Alima.\n\n"
        "Valida tu cuenta pulsando este enlace:\n"
        f"{verification_url}\n\n"
        "Este enlace caduca en 24 horas."
    )

    if not is_smtp_configured():
        logger.warning(
            "SMTP is not configured. Verification link for %s: %s",
            to_email,
            verification_url,
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
