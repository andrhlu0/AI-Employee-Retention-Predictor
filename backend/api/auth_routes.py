from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import secrets
import string

from models.user import User
from models.company import Company
from models.employee import Employee
from auth.auth_handler import auth_handler, get_current_user, get_current_company

auth_router = APIRouter()

# Get database dependency
def get_db():
    from app import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SignupRequest(BaseModel):
    company_name: str
    company_domain: str
    full_name: str
    email: EmailStr
    password: str
    role: str = "admin"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    company: dict

@auth_router.post("/signup", response_model=TokenResponse)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Create new company and admin user"""
    
    # Check if company domain already exists
    existing_company = db.query(Company).filter(
        Company.domain == request.company_domain
    ).first()
    if existing_company:
        raise HTTPException(400, "Company domain already registered")
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(400, "Email already registered")
    
    # Generate company ID
    company_id = f"COMP{''.join(secrets.choice(string.digits) for _ in range(8))}"
    
    # Create company
    company = Company(
        company_id=company_id,
        name=request.company_name,
        domain=request.company_domain,
        subscription_plan="trial",
        billing_email=request.email,
        trial_ends_at=datetime.utcnow() + timedelta(days=14)
    )
    db.add(company)
    
    # Create admin user
    user = User(
        email=request.email,
        hashed_password=auth_handler.get_password_hash(request.password),
        full_name=request.full_name,
        role="admin",
        company_id=company_id,
        can_view_all_employees=True,
        can_run_predictions=True,
        can_manage_interventions=True,
        can_manage_company=True,
        is_verified=False
    )
    db.add(user)
    db.commit()
    
    # Create access token
    access_token = auth_handler.create_access_token(
        data={"sub": user.email, "company_id": company_id, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        },
        "company": {
            "id": company.company_id,
            "name": company.name,
            "plan": company.subscription_plan,
            "trial_ends": company.trial_ends_at.isoformat()
        }
    }

@auth_router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login existing user"""
    
    # Clean email
    email = request.email.lower().strip()
    
    user = db.query(User).filter(User.email == email).first()
    if not user or not auth_handler.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Get company info
    company = db.query(Company).filter(Company.company_id == user.company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = auth_handler.create_access_token(
        data={"sub": user.email, "company_id": user.company_id, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "onboarding_completed": getattr(user, 'onboarding_completed', True)
        },
        "company": {
            "id": company.company_id,
            "name": company.name,
            "plan": company.subscription_plan,
            "status": company.subscription_status
        }
    }

@auth_router.get("/me")
async def get_current_user_info(
    user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    """Get current user information"""
    return {
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        },
        "company": {
            "id": company.company_id,
            "name": company.name,
            "plan": company.subscription_plan
        }
    }

@auth_router.post("/invite-user")
async def invite_user(
    email: EmailStr,
    role: str,
    user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Invite a new user to the company"""
    
    if user.role != "admin":
        raise HTTPException(403, "Only admins can invite users")
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(400, "User already exists")
    
    # Create invitation token
    invite_token = secrets.token_urlsafe(32)
    
    # Create user with temporary password
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    
    new_user = User(
        email=email,
        hashed_password=auth_handler.get_password_hash(temp_password),
        role=role,
        company_id=company.company_id,
        is_active=True,
        is_verified=False
    )
    
    # Set permissions based on role
    if role == "admin":
        new_user.can_view_all_employees = True
        new_user.can_run_predictions = True
        new_user.can_manage_interventions = True
        new_user.can_manage_company = True
    elif role == "manager":
        new_user.can_view_all_employees = True
        new_user.can_run_predictions = True
        new_user.can_manage_interventions = True
    elif role == "hr":
        new_user.can_view_all_employees = True
        new_user.can_manage_interventions = True
    
    db.add(new_user)
    db.commit()
    
    # Send invitation email (implement email service)
    # send_invitation_email(email, company.name, invite_token)
    
    return {"message": f"Invitation sent to {email}"}

@auth_router.post("/forgot-password")
async def forgot_password(email: EmailStr, db: Session = Depends(get_db)):
    """Request password reset"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, reset instructions have been sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    
    # Store reset token (in production, store in Redis with expiration)
    # For now, we'll just return success
    
    # Send reset email (implement email service)
    # send_reset_email(email, reset_token)
    
    return {"message": "If the email exists, reset instructions have been sent"}