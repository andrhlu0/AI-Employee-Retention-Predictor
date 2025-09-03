from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import io
from typing import List
from datetime import datetime

from models.employee import Employee
from config import settings

upload_router = APIRouter()

def get_db():
    from app import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@upload_router.post("/upload/employees")
async def upload_employees(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload employee data from CSV/Excel file"""
    try:
        # Check file extension
        if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(400, "File must be CSV or Excel format")
        
        # Read file content
        contents = await file.read()
        
        # Parse based on file type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Expected columns
        required_columns = [
            'employee_id', 'email', 'name', 'department', 
            'position', 'manager_id', 'hire_date'
        ]
        
        # Validate columns
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(400, f"Missing required columns: {missing_columns}")
        
        # Process and insert employees
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Check if employee exists
                existing = db.query(Employee).filter_by(
                    employee_id=row['employee_id']
                ).first()
                
                if existing:
                    # Update existing employee
                    for col in required_columns:
                        if col == 'hire_date':
                            setattr(existing, col, pd.to_datetime(row[col]))
                        else:
                            setattr(existing, col, row[col])
                else:
                    # Create new employee
                    employee = Employee(
                        employee_id=row['employee_id'],
                        email=row['email'],
                        name=row['name'],
                        department=row['department'],
                        position=row['position'],
                        manager_id=row.get('manager_id'),
                        hire_date=pd.to_datetime(row['hire_date']),
                        slack_user_id=row.get('slack_user_id'),
                        calendar_id=row.get('calendar_id'),
                        current_risk_score=0.5,  # Default risk score
                        is_active=True
                    )
                    db.add(employee)
                
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"Row {index + 2}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Imported {success_count} employees successfully",
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors[:10]  # Return first 10 errors
        }
        
    except Exception as e:
        raise HTTPException(500, str(e))

@upload_router.get("/upload/template")
async def download_template():
    """Download CSV template for employee upload"""
    template_data = {
        'employee_id': ['EMP001', 'EMP002', 'EMP003'],
        'email': ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com'],
        'name': ['John Doe', 'Jane Smith', 'Bob Wilson'],
        'department': ['Engineering', 'Marketing', 'Sales'],
        'position': ['Senior Developer', 'Marketing Manager', 'Sales Representative'],
        'manager_id': ['MGR001', 'MGR002', 'MGR003'],
        'hire_date': ['2022-01-15', '2021-06-01', '2023-03-20'],
        'slack_user_id': ['U001234567', 'U001234568', 'U001234569'],
        'calendar_id': ['john.doe@company.com', 'jane.smith@company.com', 'bob.wilson@company.com']
    }
    
    df = pd.DataFrame(template_data)
    
    # Convert to CSV
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type='text/csv',
        headers={"Content-Disposition": "attachment; filename=employee_template.csv"}
    )