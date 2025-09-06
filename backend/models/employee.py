from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, JSON, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from . import Base

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    department = Column(String)
    position = Column(String)
    manager_id = Column(String)  # Reference to another employee_id
    
    # Company association
    company_id = Column(String, ForeignKey("companies.company_id"))
    company = relationship("Company", back_populates="employees")
    
    # Employment details
    hire_date = Column(Date)
    salary = Column(Float, nullable=True)
    location = Column(String, nullable=True)
    employment_type = Column(String, default="full_time")  # full_time, part_time, contractor
    
    # Performance & Engagement metrics
    performance_score = Column(Float, nullable=True)
    engagement_score = Column(Float, nullable=True)
    last_promotion_date = Column(Date, nullable=True)
    
    # Risk Analysis
    current_risk_score = Column(Float, default=0.0)
    risk_factors = Column(JSON, default=lambda: [])
    last_prediction_date = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    termination_date = Column(Date, nullable=True)
    termination_reason = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    predictions = relationship("Prediction", back_populates="employee", cascade="all, delete-orphan")