from sqlalchemy import Column, String, Integer, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from . import Base

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, unique=True)  # company.com
    subscription_plan = Column(String, default="trial")  # trial, basic, professional, enterprise
    subscription_status = Column(String, default="active")  # active, cancelled, expired
    
    # Company settings
    settings = Column(JSON, default={
        "retention_threshold": 0.75,
        "alert_frequency": "daily",
        "integrations": {
            "slack": False,
            "google": False,
            "microsoft": False
        }
    })
    
    # Limits based on plan
    max_employees = Column(Integer, default=50)  # Trial limit
    max_predictions_per_month = Column(Integer, default=100)
    
    # Billing
    billing_email = Column(String)
    stripe_customer_id = Column(String)
    stripe_subscription_id = Column(String)
    
    # Timestamps
    trial_ends_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())