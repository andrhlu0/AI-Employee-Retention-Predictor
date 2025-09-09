# backend/billing/__init__.py
"""
Billing module for subscription management and feature gating
"""

from .billing_router import router as billing_router

__all__ = ['billing_router']