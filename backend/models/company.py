# backend/models/company.py
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum

from database import Base

class PlanTier(str, enum.Enum):
    TRIAL = "trial"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    domain = Column(String, unique=True, index=True)
    industry = Column(String)
    size = Column(String)  # e.g., "1-50", "50-200", "200-1000", "1000+"
    
    # Subscription related fields
    plan_tier = Column(Enum(PlanTier), default=PlanTier.TRIAL, nullable=False)
    stripe_customer_id = Column(String, unique=True, nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)
    
    # Company settings
    logo_url = Column(String, nullable=True)
    primary_color = Column(String, default="#3B82F6")
    timezone = Column(String, default="UTC")
    
    # Contact information
    billing_email = Column(String, nullable=True)
    technical_contact_email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Address
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, default="US")
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Custom settings (JSON stored as Text for SQLite compatibility)
    custom_settings = Column(Text, nullable=True)  # Store JSON string
    
    # Relationships
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="company", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="company", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="company", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="company", cascade="all, delete-orphan")
    feature_flags = relationship("FeatureFlag", back_populates="company", uselist=False, cascade="all, delete-orphan")
    
    @property
    def active_subscription(self):
        """Get the current active subscription"""
        return next((s for s in self.subscriptions if s.is_active), None)
    
    @property
    def is_trial_expired(self):
        """Check if trial period has expired"""
        if self.plan_tier != PlanTier.TRIAL:
            return False
        if not self.trial_ends_at:
            return False
        return datetime.utcnow() > self.trial_ends_at
    
    @property
    def days_until_trial_ends(self):
        """Get number of days until trial ends"""
        if self.plan_tier != PlanTier.TRIAL or not self.trial_ends_at:
            return 0
        delta = self.trial_ends_at - datetime.utcnow()
        return max(0, delta.days)
    
    @property
    def employee_count(self):
        """Get count of active employees"""
        return len([e for e in self.employees if e.is_active])
    
    @property
    def can_add_employees(self, count=1):
        """Check if company can add more employees based on plan limits"""
        from billing.billing_router import PLAN_CONFIGS
        
        plan_config = PLAN_CONFIGS.get(self.plan_tier)
        max_employees = plan_config["limits"]["max_employees"]
        
        if max_employees is None:  # Unlimited
            return True
            
        current_count = self.employee_count
        return (current_count + count) <= max_employees
    
    def get_plan_name(self):
        """Get the display name of the current plan"""
        plan_names = {
            PlanTier.TRIAL: "Free Trial",
            PlanTier.STARTER: "Starter",
            PlanTier.PROFESSIONAL: "Professional",
            PlanTier.ENTERPRISE: "Enterprise"
        }
        return plan_names.get(self.plan_tier, "Unknown")
    
    def __repr__(self):
        return f"<Company {self.name} ({self.plan_tier.value})>"