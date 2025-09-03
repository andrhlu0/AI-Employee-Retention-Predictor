from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from . import Base

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    department = Column(String)
    position = Column(String)
    manager_id = Column(String)
    hire_date = Column(DateTime)
    
    # Integration IDs
    slack_user_id = Column(String)
    calendar_id = Column(String)
    
    # Metrics
    current_risk_score = Column(Float, default=0.0)
    risk_factors = Column(JSON, default={})
    last_prediction_date = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    left_company = Column(Boolean, default=False)
    departure_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())