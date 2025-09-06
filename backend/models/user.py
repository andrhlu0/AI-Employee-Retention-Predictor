from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from . import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="viewer")  # admin, manager, hr, viewer
    
    # Company association
    company_id = Column(String, ForeignKey("companies.company_id"))
    company = relationship("Company", back_populates="users")
    
    # Permissions
    can_view_all_employees = Column(Boolean, default=False)
    can_run_predictions = Column(Boolean, default=False)
    can_manage_interventions = Column(Boolean, default=False)
    can_manage_company = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    onboarding_completed = Column(Boolean, default=False)
    
    # Timestamps
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())