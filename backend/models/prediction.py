from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.sql import func
from . import Base

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"))
    prediction_date = Column(DateTime, server_default=func.now())
    
    # Prediction details
    risk_score = Column(Float)
    confidence = Column(Float)
    predicted_departure_window = Column(String)  # e.g., "30-60 days"
    
    # Risk factors
    risk_factors = Column(JSON)
    top_risk_indicators = Column(JSON)
    
    # Intervention suggestions
    suggested_interventions = Column(JSON)
    
    # Tracking
    alert_sent = Column(Boolean, default=False)
    alert_sent_date = Column(DateTime)
    intervention_taken = Column(String)
    outcome = Column(String)  # "retained", "departed", "pending"
    
    created_at = Column(DateTime, server_default=func.now())