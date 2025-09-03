from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import random

from models.employee import Employee
from models.prediction import Prediction
from config import settings

router = APIRouter()

# Dependency for database session
def get_db():
    from app import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/dashboard")
async def get_dashboard_data(db: Session = Depends(get_db)):
    """Get dashboard overview data"""
    try:
        # Get high-risk employees
        high_risk = db.query(Employee).filter(
            Employee.current_risk_score >= settings.PREDICTION_THRESHOLD
        ).all()
        
        # Calculate statistics
        total_employees = db.query(Employee).filter_by(is_active=True).count()
        avg_risk = db.query(Employee).filter_by(is_active=True).all()
        avg_risk_score = sum([e.current_risk_score for e in avg_risk]) / len(avg_risk) if avg_risk else 0
        
        return {
            "stats": {
                "total_employees": total_employees,
                "high_risk_count": len(high_risk),
                "avg_risk_score": avg_risk_score,
                "predictions_this_month": random.randint(10, 50)
            },
            "high_risk_employees": [
                {
                    "id": emp.employee_id,
                    "name": emp.name,
                    "department": emp.department,
                    "risk_score": emp.current_risk_score,
                    "risk_factors": emp.risk_factors
                } for emp in high_risk[:5]
            ],
            "recent_alerts": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/employees")
async def get_employees(
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = None,
    risk_threshold: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Get list of employees with optional filters"""
    try:
        query = db.query(Employee).filter_by(is_active=True)
        
        if department:
            query = query.filter(Employee.department == department)
        
        if risk_threshold:
            query = query.filter(Employee.current_risk_score >= risk_threshold)
        
        employees = query.offset(skip).limit(limit).all()
        
        return [
            {
                "id": emp.employee_id,
                "name": emp.name,
                "email": emp.email,
                "department": emp.department,
                "position": emp.position,
                "risk_score": emp.current_risk_score,
                "last_prediction": emp.last_prediction_date.isoformat() if emp.last_prediction_date else None
            } for emp in employees
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/employees/{employee_id}")
async def get_employee_details(
    employee_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed information for a specific employee"""
    try:
        employee = db.query(Employee).filter_by(employee_id=employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return {
            "employee": {
                "id": employee.employee_id,
                "name": employee.name,
                "email": employee.email,
                "department": employee.department,
                "position": employee.position,
                "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
                "manager_id": employee.manager_id
            },
            "current_risk": {
                "score": employee.current_risk_score,
                "factors": employee.risk_factors,
                "last_updated": employee.last_prediction_date.isoformat() if employee.last_prediction_date else None
            },
            "latest_prediction": None,
            "history": []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/trends")
async def get_retention_trends(days: int = 30):
    """Get retention risk trends over time"""
    try:
        # Generate mock trend data
        trends = {}
        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).date().isoformat()
            trends[date] = {
                'high_risk': random.randint(5, 15),
                'medium_risk': random.randint(10, 20),
                'low_risk': random.randint(20, 40),
                'total': random.randint(35, 75)
            }
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/employees/{employee_id}/predict")
async def run_prediction(employee_id: str, db: Session = Depends(get_db)):
    """Run retention prediction for a specific employee"""
    try:
        employee = db.query(Employee).filter_by(employee_id=employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # For demo, just update with random values
        employee.current_risk_score = random.uniform(0.1, 0.95)
        employee.last_prediction_date = datetime.now()
        db.commit()
        
        return {"message": "Prediction completed", "employee_id": employee_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))