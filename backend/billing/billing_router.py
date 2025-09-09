# backend/billing/billing_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
from enum import Enum

# Note: Install stripe with: pip install stripe
# import stripe

from database import get_db
from auth.auth_handler import auth_handler
from models import User, Company, Employee, Prediction
from models.subscription import (
    Subscription, Invoice, UsageRecord, FeatureFlag,
    PlanTier, BillingCycle
)

# Initialize Stripe (uncomment when you have your keys)
# stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

# Plan configurations with feature flags
PLAN_CONFIGS = {
    PlanTier.TRIAL: {
        "name": "Free Trial",
        "stripe_price_id": None,
        "limits": {
            "max_employees": 50,
            "max_predictions_per_month": None,
            "max_api_calls_per_month": 0,
            "max_integrations": 0,
            "data_retention_days": 30
        },
        "features": {
            "basic_predictions": True,
            "email_export": True,
            "basic_dashboard": True,
            "monthly_reports": False,
            "real_time_monitoring": False,
            "slack_integration": False,
            "teams_integration": False,
            "api_access": False,
            "custom_interventions": False,
            "hris_integration": False,
            "priority_support": False,
            "dedicated_success_manager": False,
            "custom_ml_training": False,
            "white_label": False,
            "sla_guarantee": False
        }
    },
    PlanTier.STARTER: {
        "name": "Starter",
        "monthly_price": 299,
        "annual_price": 269,
        "stripe_price_id_monthly": "price_starter_monthly",
        "stripe_price_id_annual": "price_starter_annual",
        "limits": {
            "max_employees": 100,
            "max_predictions_per_month": None,
            "max_api_calls_per_month": 0,
            "max_integrations": 0,
            "data_retention_days": 90
        },
        "features": {
            "basic_predictions": True,
            "email_export": True,
            "basic_dashboard": True,
            "monthly_reports": True,
            "real_time_monitoring": False,
            "slack_integration": False,
            "teams_integration": False,
            "api_access": False,
            "custom_interventions": False,
            "hris_integration": False,
            "priority_support": False,
            "dedicated_success_manager": False,
            "custom_ml_training": False,
            "white_label": False,
            "sla_guarantee": False
        }
    },
    PlanTier.PROFESSIONAL: {
        "name": "Professional",
        "monthly_price": 799,
        "annual_price": 719,
        "stripe_price_id_monthly": "price_professional_monthly",
        "stripe_price_id_annual": "price_professional_annual",
        "limits": {
            "max_employees": 500,
            "max_predictions_per_month": None,
            "max_api_calls_per_month": 1000,
            "max_integrations": 2,
            "data_retention_days": 365
        },
        "features": {
            "basic_predictions": True,
            "email_export": True,
            "basic_dashboard": True,
            "advanced_dashboard": True,
            "monthly_reports": True,
            "real_time_monitoring": True,
            "slack_integration": True,
            "teams_integration": True,
            "api_access": True,
            "custom_interventions": True,
            "hris_integration": True,
            "priority_support": True,
            "dedicated_success_manager": False,
            "custom_ml_training": False,
            "white_label": False,
            "sla_guarantee": False
        }
    },
    PlanTier.ENTERPRISE: {
        "name": "Enterprise",
        "monthly_price": 2499,
        "annual_price": 2249,
        "stripe_price_id_monthly": "price_enterprise_monthly",
        "stripe_price_id_annual": "price_enterprise_annual",
        "limits": {
            "max_employees": None,
            "max_predictions_per_month": None,
            "max_api_calls_per_month": None,
            "max_integrations": None,
            "data_retention_days": None
        },
        "features": {
            "basic_predictions": True,
            "email_export": True,
            "basic_dashboard": True,
            "advanced_dashboard": True,
            "custom_dashboard": True,
            "monthly_reports": True,
            "real_time_monitoring": True,
            "slack_integration": True,
            "teams_integration": True,
            "api_access": True,
            "custom_interventions": True,
            "hris_integration": True,
            "priority_support": True,
            "dedicated_success_manager": True,
            "custom_ml_training": True,
            "white_label": True,
            "sla_guarantee": True
        }
    }
}

# Pydantic Models
class PlanUpgradeRequest(BaseModel):
    plan_tier: PlanTier
    billing_cycle: BillingCycle
    payment_method_id: Optional[str] = None

class UsageResponse(BaseModel):
    employees: int
    predictions: int
    api_calls: int
    storage_gb: float
    limits: Dict[str, Any]

class BillingHistoryItem(BaseModel):
    id: str
    date: datetime
    amount: float
    status: str
    invoice_url: Optional[str]
    plan_name: str

class CurrentPlanResponse(BaseModel):
    plan_tier: str
    plan_name: str
    billing_cycle: Optional[str]
    trial_days_left: int
    next_billing_date: Optional[datetime]
    features: Dict[str, bool]
    limits: Dict[str, Any]

# Helper Functions
def check_feature_access(company: Company, feature: str) -> bool:
    """Check if a company has access to a specific feature"""
    plan_config = PLAN_CONFIGS.get(company.plan_tier, PLAN_CONFIGS[PlanTier.TRIAL])
    return plan_config["features"].get(feature, False)

def check_limit(company: Company, limit_type: str, current_value: int) -> bool:
    """Check if a company is within plan limits"""
    plan_config = PLAN_CONFIGS.get(company.plan_tier, PLAN_CONFIGS[PlanTier.TRIAL])
    limit = plan_config["limits"].get(limit_type)
    if limit is None:  # Unlimited
        return True
    return current_value <= limit

# API Endpoints
@router.get("/current-plan", response_model=CurrentPlanResponse)
async def get_current_plan(
    current_user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current subscription plan details"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id,
        Subscription.is_active == True
    ).first()
    
    # Calculate trial days left if on trial
    trial_days_left = 0
    if company.plan_tier == PlanTier.TRIAL and company.trial_ends_at:
        days_left = (company.trial_ends_at - datetime.utcnow()).days
        trial_days_left = max(0, days_left)
    
    return CurrentPlanResponse(
        plan_tier=company.plan_tier.value,
        plan_name=PLAN_CONFIGS[company.plan_tier]["name"],
        billing_cycle=subscription.billing_cycle.value if subscription and subscription.billing_cycle else None,
        trial_days_left=trial_days_left,
        next_billing_date=subscription.next_billing_date if subscription else None,
        features=PLAN_CONFIGS[company.plan_tier]["features"],
        limits=PLAN_CONFIGS[company.plan_tier]["limits"]
    )

@router.get("/usage", response_model=UsageResponse)
async def get_usage_stats(
    current_user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current usage statistics"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    # Get actual usage
    employee_count = db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.is_active == True
    ).count()
    
    # Get predictions count for current month
    current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    predictions_count = db.query(Prediction).filter(
        Prediction.company_id == company.id,
        Prediction.created_at >= current_month_start
    ).count()
    
    # Get API calls for current month
    api_calls = db.query(func.sum(UsageRecord.api_call_count)).filter(
        UsageRecord.company_id == company.id,
        UsageRecord.period_start >= current_month_start
    ).scalar() or 0
    
    # Calculate storage (mock for now)
    storage_gb = 2.3
    
    return UsageResponse(
        employees=employee_count,
        predictions=predictions_count,
        api_calls=api_calls,
        storage_gb=storage_gb,
        limits=PLAN_CONFIGS[company.plan_tier]["limits"]
    )

@router.post("/upgrade")
async def upgrade_plan(
    request: PlanUpgradeRequest,
    current_user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade or change subscription plan"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    if request.plan_tier == company.plan_tier:
        raise HTTPException(status_code=400, detail="Already on this plan")
    
    # For demo/testing without Stripe
    # In production, uncomment the Stripe integration below
    
    # Update database
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id,
        Subscription.is_active == True
    ).first()
    
    if not subscription:
        subscription = Subscription(
            company_id=company.id,
            plan_tier=request.plan_tier,
            billing_cycle=request.billing_cycle,
            is_active=True,
            started_at=datetime.utcnow(),
            next_billing_date=datetime.utcnow() + timedelta(days=30)
        )
        db.add(subscription)
    else:
        subscription.plan_tier = request.plan_tier
        subscription.billing_cycle = request.billing_cycle
        subscription.updated_at = datetime.utcnow()
    
    company.plan_tier = request.plan_tier
    db.commit()
    
    """ 
    # Stripe Integration (uncomment when ready)
    try:
        plan_config = PLAN_CONFIGS[request.plan_tier]
        price_id = (plan_config[f"stripe_price_id_{request.billing_cycle.value}"] 
                   if request.billing_cycle == BillingCycle.ANNUAL 
                   else plan_config["stripe_price_id_monthly"])
        
        # Create or update Stripe customer
        if not company.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"company_id": str(company.id)}
            )
            company.stripe_customer_id = customer.id
        
        # Create subscription in Stripe
        stripe_subscription = stripe.Subscription.create(
            customer=company.stripe_customer_id,
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"]
        )
        
        # Update subscription with Stripe ID
        subscription.stripe_subscription_id = stripe_subscription.id
        db.commit()
        
        return {
            "success": True,
            "message": f"Successfully upgraded to {plan_config['name']}",
            "client_secret": stripe_subscription.latest_invoice.payment_intent.client_secret,
            "subscription_id": subscription.id
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    """
    
    return {
        "success": True,
        "message": f"Successfully upgraded to {PLAN_CONFIGS[request.plan_tier]['name']}",
        "subscription_id": subscription.id
    }

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel current subscription"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id,
        Subscription.is_active == True
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # Cancel subscription
    subscription.is_active = False
    subscription.ended_at = datetime.utcnow()
    company.plan_tier = PlanTier.TRIAL
    
    db.commit()
    
    return {"success": True, "message": "Subscription cancelled successfully"}

@router.get("/billing-history", response_model=List[BillingHistoryItem])
async def get_billing_history(
    current_user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db)
):
    """Get billing history and invoices"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    # Get invoices from database
    invoices = db.query(Invoice).filter(
        Invoice.company_id == company.id
    ).order_by(Invoice.created_at.desc()).limit(12).all()
    
    history = []
    for invoice in invoices:
        history.append(BillingHistoryItem(
            id=str(invoice.id),
            date=invoice.created_at,
            amount=invoice.total,
            status=invoice.status,
            invoice_url=invoice.invoice_pdf_url,
            plan_name=PLAN_CONFIGS.get(invoice.subscription.plan_tier, {}).get("name", "Unknown")
        ))
    
    # For demo purposes, add some mock data if no real invoices
    if not history and company.plan_tier != PlanTier.TRIAL:
        history = [
            BillingHistoryItem(
                id="demo-1",
                date=datetime.utcnow() - timedelta(days=30),
                amount=799.00,
                status="paid",
                invoice_url=None,
                plan_name="Professional Plan"
            ),
            BillingHistoryItem(
                id="demo-2",
                date=datetime.utcnow() - timedelta(days=60),
                amount=799.00,
                status="paid",
                invoice_url=None,
                plan_name="Professional Plan"
            )
        ]
    
    return history

@router.get("/check-feature/{feature_name}")
async def check_feature(
    feature_name: str,
    current_user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db)
):
    """Check if current plan has access to a specific feature"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    has_access = check_feature_access(company, feature_name)
    
    return {
        "feature": feature_name,
        "has_access": has_access,
        "current_plan": company.plan_tier.value,
        "required_plan": get_minimum_plan_for_feature(feature_name)
    }

def get_minimum_plan_for_feature(feature_name: str) -> str:
    """Get the minimum plan required for a feature"""
    for plan_tier in [PlanTier.STARTER, PlanTier.PROFESSIONAL, PlanTier.ENTERPRISE]:
        if PLAN_CONFIGS[plan_tier]["features"].get(feature_name, False):
            return plan_tier.value
    return PlanTier.ENTERPRISE.value