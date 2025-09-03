from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from models.employee import Employee

class EmployeeCreateRequest(BaseModel):
    employee_id: str
    email: str
    name: str
    department: str
    position: str
    manager_id: Optional[str] = None
    hire_date: datetime
    slack_user_id: Optional[str] = None
    calendar_id: Optional[str] = None

employee_api = APIRouter()

@employee_api.post("/api/employees/bulk")
async def bulk_create_employees(
    employees: List[EmployeeCreateRequest],
    api_key: str,
    db: Session = Depends(get_db)
):
    """Bulk create/update employees via API"""
    
    # Validate API key
    if api_key != settings.API_KEY:
        raise HTTPException(403, "Invalid API key")
    
    created = 0
    updated = 0
    
    for emp_data in employees:
        existing = db.query(Employee).filter_by(
            employee_id=emp_data.employee_id
        ).first()
        
        if existing:
            # Update
            for field, value in emp_data.dict().items():
                setattr(existing, field, value)
            updated += 1
        else:
            # Create
            employee = Employee(**emp_data.dict())
            db.add(employee)
            created += 1
    
    db.commit()
    
    return {
        "created": created,
        "updated": updated,
        "total": len(employees)
    }