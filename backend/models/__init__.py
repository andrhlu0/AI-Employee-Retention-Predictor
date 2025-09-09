# backend/models/__init__.py
"""
Database models for AI Employee Retention Predictor
"""

from database import Base

# Import all models to ensure they're registered with SQLAlchemy
from .user import User
from .company import Company, PlanTier
from .employee import Employee
from .prediction import Prediction, RiskLevel
from .subscription import (
    Subscription, 
    Invoice, 
    UsageRecord, 
    FeatureFlag,
    BillingCycle,
    # Re-export PlanTier from subscription if it's defined there
    # Otherwise it should be imported from company.py
)

# Export all models for easy importing
__all__ = [
    'Base',
    'User',
    'Company',
    'Employee',
    'Prediction',
    'RiskLevel',
    'Subscription',
    'Invoice',
    'UsageRecord',
    'FeatureFlag',
    'PlanTier',
    'BillingCycle',
]