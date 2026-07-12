"""
TransitOps security — JWT token handling, password hashing, OTP, and email.
"""

import hashlib
import random
import re
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from jose import JWTError, jwt
import bcrypt

from app.config import settings


# ──────────────────────────── Password ────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with cost factor 12."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False


def validate_password_strength(password: str) -> None:
    """
    Validate password complexity: min 8 chars, at least 1 uppercase, 1 digit.
    Raises ValueError with a message if validation fails.
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least 1 uppercase letter.")
    if not re.search(r'[0-9]', password):
        raise ValueError("Password must contain at least 1 digit.")


# ──────────────────────────── JWT ────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with sub, role, and exp claims only."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token. Returns payload or None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# ──────────────────────────── OTP ────────────────────────────

def generate_otp() -> str:
    """Generate a random 6-digit OTP code."""
    return str(random.randint(100000, 999999))


def hash_otp(otp: str) -> str:
    """Hash an OTP code with SHA256 for secure storage."""
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()


# ──────────────────────────── Email ────────────────────────────

def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send an email via Gmail SMTP with TLS.
    Returns True on success, False on failure (does not raise).
    """
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:
        # Log in production; for hackathon, fail silently
        return False
