from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from . import Base

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Employee association
    employee_id = Column(String, ForeignKey("employees.employee_id"))
    employee = relationship("Employee", back_populates="predictions")
    
    # Prediction details
    prediction_date = Column(DateTime, server_default=func.now())
    risk_score = Column(Float)  # 0.0 to 1.0
    confidence_score = Column(Float)  # Model confidence in the prediction
    prediction_horizon_days = Column(Integer, default=90)  # How far ahead we're predicting
    
    # Risk factors and recommendations
    risk_factors = Column(JSON, default=lambda: [])
    recommendations = Column(JSON, default=lambda: [])
    
    # Model metadata
    model_version = Column(String)
    feature_importance = Column(JSON, default=lambda: {})
    
    # Outcome tracking (for model improvement)
    actual_outcome = Column(String, nullable=True)  # stayed, left, promoted, etc.
    outcome_date = Column(DateTime, nullable=True)
    
    # Intervention tracking
    interventions_applied = Column(JSON, default=lambda: [])
    intervention_success = Column(Boolean, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())