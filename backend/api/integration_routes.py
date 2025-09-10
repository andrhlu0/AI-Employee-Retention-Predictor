# backend/api/integration_routes.py - Updated with credential manager
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
import asyncio
import logging

from database import get_db
from models.user import User
from models.company import Company
from models.employee import Employee
from auth import get_current_user
from services.credential_manager import credential_manager, ai_credential_manager
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

# Pydantic models
class HRISCredentials(BaseModel):
    system: str
    credentials: Dict
    test_only: Optional[bool] = False

class AICredentials(BaseModel):
    provider: str
    api_key: str
    test_only: Optional[bool] = False

class IntegrationStatus(BaseModel):
    system: str
    connected: bool
    last_sync: Optional[datetime]
    employee_count: Optional[int]
    error: Optional[str]

@router.post("/hris/test")
async def test_hris_connection(
    request: HRISCredentials,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test HRIS connection without saving credentials"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        result = credential_manager.test_connection(
            company_id=current_user.company_id,
            system=request.system,
            credentials=request.credentials,
            db=db
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error testing HRIS connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hris/connect")
async def connect_hris(
    request: HRISCredentials,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect and save HRIS credentials"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Test connection first
        test_result = credential_manager.test_connection(
            company_id=current_user.company_id,
            system=request.system,
            credentials=request.credentials,
            db=db
        )
        
        if not test_result['success']:
            raise HTTPException(status_code=400, detail=test_result['error'])
        
        # Save credentials if test passed
        if not request.test_only:
            success = credential_manager.save_hris_credentials(
                company_id=current_user.company_id,
                system=request.system,
                credentials=request.credentials,
                db=db
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to save credentials")
        
        return {
            "success": True,
            "message": f"Successfully connected to {request.system}",
            "employee_count": test_result.get('employee_count', 0)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting to HRIS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/hris/disconnect/{system}")
async def disconnect_hris(
    system: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect and remove HRIS credentials"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        success = credential_manager.remove_credentials(
            company_id=current_user.company_id,
            system=system,
            db=db
        )
        
        if success:
            return {
                "success": True,
                "message": f"Disconnected from {system}"
            }
        else:
            raise HTTPException(status_code=404, detail=f"No connection found for {system}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting HRIS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hris/sync")
async def sync_hris_data(
    background_tasks: BackgroundTasks,
    system: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync employee data from HRIS"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Add sync task to background
        background_tasks.add_task(
            sync_employees_background,
            company_id=current_user.company_id,
            system=system,
            user_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Sync started in background",
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Error starting HRIS sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def sync_employees_background(company_id: int, system: Optional[str], user_id: int):
    """Background task to sync employees"""
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        if system:
            # Sync from specific system
            connector = credential_manager.get_hris_connector(company_id, system, db)
            if not connector:
                logger.error(f"No connector available for {system}")
                return
            
            employees = connector.fetch_employees()
            systems_synced = {system: len(employees)}
        else:
            # Sync from all systems
            result = credential_manager.sync_all_employees(company_id, db)
            employees = []
            systems_synced = result['systems']
            
            # Collect all employees
            connectors = credential_manager.get_all_connectors(company_id, db)
            for sys, conn in connectors.items():
                try:
                    emps = conn.fetch_employees()
                    employees.extend(emps)
                except Exception as e:
                    logger.error(f"Error fetching from {sys}: {e}")
        
        # Update or create employees in database
        for emp_data in employees:
            employee = db.query(Employee).filter(
                Employee.company_id == company_id,
                Employee.external_id == emp_data['employee_id']
            ).first()
            
            if not employee:
                employee = Employee(
                    company_id=company_id,
                    external_id=emp_data['employee_id'],
                    source=emp_data.get('source', 'hris')
                )
                db.add(employee)
            
            # Update employee data
            employee.email = emp_data.get('email')
            employee.name = emp_data.get('name')
            employee.department = emp_data.get('department')
            employee.position = emp_data.get('position')
            employee.location = emp_data.get('location')
            employee.manager_id = emp_data.get('manager_id')
            employee.hire_date = emp_data.get('hire_date')
            employee.employment_status = emp_data.get('employment_status')
            employee.last_sync = datetime.now()
        
        db.commit()
        logger.info(f"Synced {len(employees)} employees for company {company_id}")
        logger.info(f"Systems synced: {systems_synced}")
        
    except Exception as e:
        logger.error(f"Error in background sync: {e}")
        db.rollback()
    finally:
        db.close()

@router.get("/hris/status", response_model=List[IntegrationStatus])
async def get_hris_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of all HRIS integrations"""
    statuses = []
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    for system in ['bamboohr', 'workday', 'adp', 'successfactors']:
        status = IntegrationStatus(
            system=system,
            connected=False,
            last_sync=None,
            employee_count=None,
            error=None
        )
        
        # Check if company has this integration
        if company and company.integrations and system in company.integrations:
            integration = company.integrations[system]
            status.connected = integration.get('connected', False)
            status.error = integration.get('error')
            
            # Get last sync time from integration data
            if integration.get('last_sync'):
                try:
                    status.last_sync = datetime.fromisoformat(integration['last_sync'])
                except:
                    pass
            
            # Get employee count
            if status.connected:
                employee_count = db.query(Employee).filter(
                    Employee.company_id == current_user.company_id,
                    Employee.source == system
                ).count()
                status.employee_count = employee_count
        
        statuses.append(status)
    
    return statuses

@router.post("/ai-scoring/test")
async def test_ai_connection(
    request: AICredentials,
    current_user: User = Depends(get_current_user)
):
    """Test AI provider connection without saving"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        result = ai_credential_manager.test_ai_connection(
            provider=request.provider,
            api_key=request.api_key
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error testing AI connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-scoring/configure")
async def configure_ai_scoring(
    request: AICredentials,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Configure and save AI scoring credentials"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Test connection first
        test_result = ai_credential_manager.test_ai_connection(
            provider=request.provider,
            api_key=request.api_key
        )
        
        if not test_result['success']:
            raise HTTPException(status_code=400, detail=test_result['error'])
        
        # Save credentials if not test only
        if not request.test_only:
            success = ai_credential_manager.save_ai_credentials(
                company_id=current_user.company_id,
                provider=request.provider,
                api_key=request.api_key,
                db=db
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to save credentials")
        
        return {
            "success": True,
            "message": f"AI scoring configured with {request.provider}",
            "provider": request.provider
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring AI scoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/ai-scoring/disconnect")
async def disconnect_ai_scoring(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect AI scoring"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        if company and company.settings and 'ai_scoring' in company.settings:
            company.settings['ai_scoring']['enabled'] = False
            db.commit()
            
            # Remove from cache
            if current_user.company_id in ai_credential_manager.ai_scorers:
                del ai_credential_manager.ai_scorers[current_user.company_id]
            
            return {
                "success": True,
                "message": "AI scoring disconnected"
            }
        else:
            raise HTTPException(status_code=404, detail="No AI scoring configuration found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting AI scoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-scoring/calculate/{employee_id}")
async def calculate_engagement_score(
    employee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate AI engagement score for an employee"""
    try:
        # Get AI scorer for company
        scorer = ai_credential_manager.get_ai_scorer(current_user.company_id, db)
        if not scorer:
            raise HTTPException(status_code=400, detail="AI scoring not configured")
        
        # Get employee
        employee = db.query(Employee).filter(
            Employee.company_id == current_user.company_id,
            Employee.id == employee_id
        ).first()
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get employee metrics (would fetch from integrations in production)
        employee_data = await get_employee_metrics(employee, db)
        
        # Calculate engagement score
        result = await scorer.calculate_engagement_score(employee_data)
        
        # Store result in database
        employee.engagement_score = result['engagement_score']
        employee.engagement_level = result['engagement_level']
        employee.last_engagement_update = datetime.now()
        
        if not employee.engagement_history:
            employee.engagement_history = []
        
        employee.engagement_history.append({
            'timestamp': result['timestamp'],
            'score': result['engagement_score'],
            'level': result['engagement_level']
        })
        
        # Keep only last 12 months of history
        if len(employee.engagement_history) > 12:
            employee.engagement_history = employee.engagement_history[-12:]
        
        db.commit()
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating engagement score: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-scoring/batch")
async def batch_calculate_scores(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate engagement scores for all employees"""
    try:
        if current_user.role not in ['admin', 'hr_manager']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Check if AI scoring is configured
        scorer = ai_credential_manager.get_ai_scorer(current_user.company_id, db)
        if not scorer:
            raise HTTPException(status_code=400, detail="AI scoring not configured")
        
        # Add to background tasks
        background_tasks.add_task(
            calculate_all_scores_background,
            company_id=current_user.company_id,
            user_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Batch scoring started in background",
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting batch scoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def calculate_all_scores_background(company_id: int, user_id: int):
    """Background task to calculate all engagement scores"""
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        # Get AI scorer
        scorer = ai_credential_manager.get_ai_scorer(company_id, db)
        if not scorer:
            logger.error("AI scoring not configured")
            return
        
        # Get all active employees
        employees = db.query(Employee).filter(
            Employee.company_id == company_id,
            Employee.employment_status == 'active'
        ).all()
        
        success_count = 0
        error_count = 0
        
        for employee in employees:
            try:
                # Get employee metrics
                employee_data = await get_employee_metrics(employee, db)
                
                # Calculate score
                result = await scorer.calculate_engagement_score(employee_data)
                
                # Update database
                employee.engagement_score = result['engagement_score']
                employee.engagement_level = result['engagement_level']
                employee.last_engagement_update = datetime.now()
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"Error scoring employee {employee.id}: {e}")
                error_count += 1
        
        db.commit()
        logger.info(f"Batch scoring complete: {success_count} successful, {error_count} errors")
        
    except Exception as e:
        logger.error(f"Error in batch scoring: {e}")
        db.rollback()
    finally:
        db.close()

async def get_employee_metrics(employee: Employee, db: Session) -> Dict:
    """Get employee metrics from various sources"""
    # In production, this would fetch real data from Slack, email, calendar, etc.
    # For now, generate sample data
    import random
    
    return {
        'employee_id': employee.id,
        'slack_metrics': {
            'message_count': random.randint(50, 300),
            'avg_response_time': random.randint(10, 120),
            'sentiment_score': random.uniform(-0.5, 0.5),
            'after_hours_messages': random.randint(0, 30),
            'active_channels': random.randint(3, 15)
        },
        'email_metrics': {
            'sent_count': random.randint(20, 150),
            'received_count': random.randint(30, 200),
            'avg_response_time': random.randint(15, 180),
            'unread_percentage': random.randint(0, 40)
        },
        'calendar_metrics': {
            'total_meeting_hours': random.randint(5, 30),
            'one_on_one_count': random.randint(0, 6),
            'declined_percentage': random.randint(0, 20),
            'focus_time_hours': random.randint(10, 30),
            'collaboration_hours': random.randint(5, 20),
            'pto_days': random.randint(0, 20),
            'after_hours_meetings': random.randint(0, 10),
            'meeting_load_score': random.uniform(0.2, 0.9),
            'weekend_hours': random.randint(0, 5)
        },
        'productivity_metrics': {
            'tasks_completed': random.randint(10, 50),
            'active_projects': random.randint(1, 8),
            'on_time_percentage': random.uniform(0.6, 1.0),
            'velocity_score': random.uniform(0.5, 1.0)
        }
    }

@router.get("/ai-scoring/status")
async def get_ai_scoring_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI scoring configuration status"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    if company and company.settings and 'ai_scoring' in company.settings:
        ai_settings = company.settings['ai_scoring']
        
        # Check if scorer is available
        scorer = ai_credential_manager.get_ai_scorer(current_user.company_id, db)
        
        return {
            'enabled': ai_settings.get('enabled', False),
            'provider': ai_settings.get('provider'),
            'configured_at': ai_settings.get('configured_at'),
            'is_active': scorer is not None,
            'last_batch_run': None  # Would track this in production
        }
    else:
        return {
            'enabled': False,
            'provider': None,
            'configured_at': None,
            'is_active': False,
            'last_batch_run': None
        }

@router.get("/available-systems")
async def get_available_systems():
    """Get list of available HRIS and AI systems"""
    return {
        "hris_systems": [
            {
                "id": "bamboohr",
                "name": "BambooHR",
                "description": "Modern HR software with a focus on user experience",
                "required_fields": {
                    "api_key": "API Key",
                    "subdomain": "Company Subdomain"
                },
                "documentation_url": "https://documentation.bamboohr.com/reference",
                "setup_time": "5 minutes"
            },
            {
                "id": "workday",
                "name": "Workday",
                "description": "Enterprise cloud applications for HR and finance",
                "required_fields": {
                    "client_id": "Client ID",
                    "client_secret": "Client Secret",
                    "tenant": "Tenant Name"
                },
                "optional_fields": {
                    "refresh_token": "Refresh Token"
                },
                "documentation_url": "https://community.workday.com",
                "setup_time": "15 minutes"
            },
            {
                "id": "adp",
                "name": "ADP Workforce Now",
                "description": "Comprehensive HR management for mid-sized businesses",
                "required_fields": {
                    "client_id": "Client ID",
                    "client_secret": "Client Secret"
                },
                "documentation_url": "https://developers.adp.com",
                "setup_time": "10 minutes"
            },
            {
                "id": "successfactors",
                "name": "SAP SuccessFactors",
                "description": "Cloud-based HR solution from SAP",
                "required_fields": {
                    "company_id": "Company ID",
                    "api_key": "API Key"
                },
                "optional_fields": {
                    "username": "API Username"
                },
                "documentation_url": "https://help.sap.com",
                "setup_time": "10 minutes"
            }
        ],
        "ai_providers": [
            {
                "id": "openai",
                "name": "OpenAI",
                "description": "GPT-4 and GPT-3.5 for advanced analysis",
                "required_fields": {
                    "api_key": "API Key"
                },
                "models": [
                    {"id": "gpt-4", "name": "GPT-4", "cost_per_analysis": "$0.03"},
                    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "cost_per_analysis": "$0.002"}
                ],
                "pricing_url": "https://openai.com/pricing",
                "setup_time": "2 minutes"
            },
            {
                "id": "anthropic",
                "name": "Anthropic Claude",
                "description": "Claude 3 for safe and accurate analysis",
                "required_fields": {
                    "api_key": "API Key"
                },
                "models": [
                    {"id": "claude-3-opus", "name": "Claude 3 Opus", "cost_per_analysis": "$0.015"},
                    {"id": "claude-3-haiku", "name": "Claude 3 Haiku", "cost_per_analysis": "$0.0025"}
                ],
                "pricing_url": "https://www.anthropic.com/pricing",
                "setup_time": "2 minutes"
            }
        ]
    }

@router.get("/sync-status/{sync_id}")
async def get_sync_status(
    sync_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of a sync operation"""
    # In production, would track sync operations in database
    return {
        "sync_id": sync_id,
        "status": "completed",
        "employees_synced": 50,
        "systems": ["bamboohr"],
        "completed_at": datetime.now().isoformat()
    }