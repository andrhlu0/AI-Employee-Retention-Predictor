# models/subscription.py
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum
from database import Base

class PlanTier(str, enum.Enum):
    TRIAL = "trial"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class BillingCycle(str, enum.Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    plan_tier = Column(Enum(PlanTier), default=PlanTier.TRIAL, nullable=False)
    billing_cycle = Column(Enum(BillingCycle), nullable=True)
    
    # Stripe IDs
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    stripe_payment_method_id = Column(String, nullable=True)
    
    # Subscription details
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    next_billing_date = Column(DateTime, nullable=True)
    
    # Pricing
    monthly_price = Column(Float, nullable=True)
    
    # Trial information
    trial_ends_at = Column(DateTime, nullable=True)
    trial_extended = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="subscriptions")
    invoices = relationship("Invoice", back_populates="subscription")
    usage_records = relationship("UsageRecord", back_populates="subscription")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Invoice details
    stripe_invoice_id = Column(String, unique=True, nullable=True)
    invoice_number = Column(String, unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    tax = Column(Float, default=0)
    total = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    
    # Status
    status = Column(String, default="pending")  # pending, paid, failed, cancelled
    paid_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    
    # Billing period
    billing_period_start = Column(DateTime, nullable=False)
    billing_period_end = Column(DateTime, nullable=False)
    
    # PDF URL
    invoice_pdf_url = Column(String, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="invoices")
    company = relationship("Company", back_populates="invoices")

class UsageRecord(Base):
    __tablename__ = "usage_records"
    
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Usage metrics
    employee_count = Column(Integer, default=0)
    prediction_count = Column(Integer, default=0)
    api_call_count = Column(Integer, default=0)
    storage_bytes = Column(Integer, default=0)
    integration_count = Column(Integer, default=0)
    
    # Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="usage_records")
    company = relationship("Company")

class FeatureFlag(Base):
    __tablename__ = "feature_flags"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Feature toggles (stored as JSON for flexibility)
    features = Column(JSON, default={})
    
    # Override flags for specific companies
    custom_limits = Column(JSON, default={})
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="feature_flags")

# Update Company model to include subscription relationship
def update_company_model():
    """
    Add these fields to your existing Company model:
    """
    return """
    # In your existing Company model, add:
    
    plan_tier = Column(Enum(PlanTier), default=PlanTier.TRIAL, nullable=False)
    stripe_customer_id = Column(String, unique=True, nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="company")
    invoices = relationship("Invoice", back_populates="company")
    feature_flags = relationship("FeatureFlag", back_populates="company", uselist=False)
    
    @property
    def active_subscription(self):
        return next((s for s in self.subscriptions if s.is_active), None)
    
    @property
    def is_trial_expired(self):
        if self.plan_tier != PlanTier.TRIAL:
            return False
        if not self.trial_ends_at:
            return False
        return datetime.utcnow() > self.trial_ends_at
    
    @property
    def days_until_trial_ends(self):
        if self.plan_tier != PlanTier.TRIAL or not self.trial_ends_at:
            return 0
        delta = self.trial_ends_at - datetime.utcnow()
        return max(0, delta.days)
    """

# Feature access decorator for API endpoints
def requires_feature(feature_name: str):
    """
    Decorator to check if a company has access to a feature
    Usage: @requires_feature("api_access")
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get current user from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                from fastapi import HTTPException
                raise HTTPException(status_code=401, detail="Authentication required")
            
            company = db.query(Company).filter(Company.id == current_user.company_id).first()
            
            # Check if company has access to feature
            from billing.billing_router import check_feature_access
            if not check_feature_access(company, feature_name):
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=403, 
                    detail=f"This feature requires a higher plan. Current plan: {company.plan_tier}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage tracking functions
async def track_api_usage(company_id: int, db):
    """Track API usage for rate limiting"""
    # Get or create today's usage record
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    usage = db.query(UsageRecord).filter(
        UsageRecord.company_id == company_id,
        UsageRecord.period_start == today_start
    ).first()
    
    if not usage:
        usage = UsageRecord(
            company_id=company_id,
            subscription_id=db.query(Subscription).filter(
                Subscription.company_id == company_id,
                Subscription.is_active == True
            ).first().id if db.query(Subscription).filter(
                Subscription.company_id == company_id,
                Subscription.is_active == True
            ).first() else None,
            period_start=today_start,
            period_end=today_end,
            api_call_count=0
        )
        db.add(usage)
    
    usage.api_call_count += 1
    db.commit()
    
    return usage.api_call_count

async def check_usage_limit(company_id: int, limit_type: str, db) -> tuple[bool, int, int]:
    """
    Check if company is within usage limits
    Returns: (is_within_limit, current_usage, limit)
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    
    # Get plan limits
    from billing.billing_router import PLAN_CONFIGS
    plan_config = PLAN_CONFIGS.get(company.plan_tier)
    limit = plan_config["limits"].get(limit_type)
    
    if limit is None:  # Unlimited
        return True, 0, -1
    
    # Get current usage
    if limit_type == "max_employees":
        current = db.query(Employee).filter(
            Employee.company_id == company_id,
            Employee.is_active == True
        ).count()
    elif limit_type == "max_api_calls_per_month":
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        current = db.query(func.sum(UsageRecord.api_call_count)).filter(
            UsageRecord.company_id == company_id,
            UsageRecord.period_start >= month_start
        ).scalar() or 0
    else:
        current = 0
    
    return current <= limit, current, limit