"""
Auth router — registration, login, password reset (OTP), and user management.

Endpoints:
  POST /auth/register          — create a new user (open, defaults to driver role)
  POST /auth/login             — email + password → JWT + user object
  POST /auth/forgot-password   — send OTP to email
  POST /auth/verify-otp        — verify OTP, return reset code
  POST /auth/reset-password    — reset password using reset code
  GET  /auth/me                — current authenticated user profile
  POST /users                  — fleet_manager creates a user with explicit role
  GET  /users                  — fleet_manager lists users
"""

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import (
    UserRegister, UserLogin, LoginResponse, UserResponse,
    ForgotPasswordRequest, VerifyOTPRequest, VerifyOTPResponse,
    ResetPasswordRequest, MessageResponse, UserCreateByManager,
)
from app.security import (
    hash_password, verify_password, create_access_token,
    validate_password_strength, generate_otp, hash_otp, send_email,
)
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["Auth"])


# ──────────────────────────── Registration ────────────────────────────

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account. No authentication required. "
                "Role defaults to 'driver'. Password must be 8+ chars with "
                "1 uppercase and 1 digit.",
    responses={
        409: {"description": "Email already registered"},
        400: {"description": "Weak password"},
    },
)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Password complexity check
    try:
        validate_password_strength(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "token": token,
    }


# ──────────────────────────── Login ────────────────────────────

@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login and obtain JWT",
    description="Authenticate with email and password. Returns a JWT access "
                "token and the user profile object.",
    responses={
        401: {"description": "Invalid credentials"},
    },
)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )
    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ──────────────────────────── Forgot Password ────────────────────────────

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset OTP",
    description="Send a 6-digit OTP to the user's email. Always returns 200 "
                "to avoid leaking user existence.",
)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        otp = generate_otp()
        user.reset_token = hash_otp(otp)
        user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
        user.reset_requested_at = datetime.utcnow()
        db.commit()

        # Send email (non-blocking for hackathon — if SMTP fails, we still return 200)
        send_email(
            to_email=user.email,
            subject="TransitOps Password Reset",
            body=f"Your password reset OTP is: {otp}\n"
                 f"This code expires in 15 minutes.\n"
                 f"Do not share this with anyone.",
        )

    # Always return success to avoid leaking user existence
    return MessageResponse(
        message="If a user with this email exists, they will receive a password reset link."
    )


# ──────────────────────────── Verify OTP ────────────────────────────

@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
    summary="Verify password reset OTP",
    description="Verify the 6-digit OTP sent to email. Returns a temporary "
                "reset code valid for 10 minutes.",
    responses={
        401: {"description": "Invalid or expired OTP"},
    },
)
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # Check OTP hash matches
    if user.reset_token != hash_otp(payload.otp):
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # Check OTP not expired
    if user.reset_token_expiry is None or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")

    # Generate a temporary reset code (valid 10 minutes)
    reset_code = str(uuid.uuid4())
    user.reset_token = hash_otp(reset_code)  # Reuse the column for the reset code
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    return VerifyOTPResponse(reset_code=reset_code, expires_in=600)


# ──────────────────────────── Reset Password ────────────────────────────

@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using reset code",
    description="Reset the user's password using the reset code obtained "
                "from OTP verification.",
    responses={
        400: {"description": "Weak password"},
        401: {"description": "Invalid or expired reset code"},
    },
)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid reset code")

    # Validate reset code
    if user.reset_token != hash_otp(payload.reset_code):
        raise HTTPException(status_code=401, detail="Invalid reset code")

    if user.reset_token_expiry is None or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Reset code has expired")

    # Validate new password
    try:
        validate_password_strength(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update password and clear reset fields
    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    user.reset_requested_at = None
    db.commit()

    return MessageResponse(message="Password reset successfully. You can now log in.")


# ──────────────────────────── Get Current User ────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Returns the profile of the currently authenticated user.",
    responses={
        401: {"description": "Not authenticated or invalid token"},
    },
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ──────────────────────────── User Management (Fleet Manager) ────────────────────────────

users_router = APIRouter(prefix="/users", tags=["User Management"])


@users_router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (fleet manager only)",
    description="Fleet managers can create users with explicit roles.",
    responses={
        403: {"description": "Not a fleet manager"},
        409: {"description": "Email already registered"},
    },
)
def create_user(
    payload: UserCreateByManager,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    # Validate password
    try:
        validate_password_strength(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        created_by=current_user.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@users_router.get(
    "",
    response_model=list[UserResponse],
    summary="List users (fleet manager only)",
    description="Fleet managers can list all users with optional role filter.",
    responses={
        403: {"description": "Not a fleet manager"},
    },
)
def list_users(
    role: UserRole | None = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()
