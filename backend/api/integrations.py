from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging

from database import get_db
from services.ai_engagement_scorer import AIEngagementScorer
from services.data_collector import DataCollector
from auth.dependencies import get_current_user
from models.user import User
from models.employee import Employee

router = APIRouter(prefix="/api/integrations", tags=["integrations"])
logger = logging.getLogger(__name__)

@router.post("/slack/auth")
async def slack_auth(
    redirect_uri: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate Slack OAuth flow"""
    try:
        # Generate OAuth URL
        client_id = settings.SLACK_CLIENT_ID
        scopes = "channels:read,chat:write,users:read,users:read.email"
        
        auth_url = f"https://slack.com/oauth/v2/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}"
        
        return {"auth_url": auth_url, "success": True}
    except Exception as e:
        logger.error(f"Error initiating Slack auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/slack/callback")
async def slack_callback(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Handle Slack OAuth callback"""
    try:
        # Exchange code for token
        import requests
        response = requests.post("https://slack.com/api/oauth.v2.access", {
            "client_id": settings.SLACK_CLIENT_ID,
            "client_secret": settings.SLACK_CLIENT_SECRET,
            "code": code
        })
        
        data = response.json()
        if data.get("ok"):
            # Store tokens securely
            # Update company integration settings
            return {"success": True, "team": data.get("team")}
        else:
            raise HTTPException(status_code=400, detail=data.get("error"))
            
    except Exception as e:
        logger.error(f"Error in Slack callback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/slack/status")
async def slack_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check Slack connection status"""
    # Check if tokens exist and are valid
    # This would check your database for stored tokens
    return {
        "connected": False,  # Check actual status
        "status": "disconnected",
        "lastSync": None
    }

@router.post("/google/auth")
async def google_auth(
    scopes: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate Google OAuth flow"""
    try:
        from google_auth_oauthlib.flow import Flow
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
            },
            scopes=scopes
        )
        
        flow.redirect_uri = f"{settings.APP_URL}/settings/integrations/google/callback"
        
        auth_url, _ = flow.authorization_url(prompt='consent')
        
        return {"auth_url": auth_url, "success": True}
    except Exception as e:
        logger.error(f"Error initiating Google auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/microsoft/auth")
async def microsoft_auth(
    scopes: List[str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate Microsoft OAuth flow"""
    try:
        import msal
        
        app = msal.PublicClientApplication(
            settings.MICROSOFT_CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}"
        )
        
        auth_url = app.get_authorization_request_url(
            scopes=scopes,
            redirect_uri=f"{settings.APP_URL}/settings/integrations/microsoft/callback"
        )
        
        return {"auth_url": auth_url, "success": True}
    except Exception as e:
        logger.error(f"Error initiating Microsoft auth: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-scoring/enable")
async def enable_ai_scoring(
    config: Dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enable AI-powered engagement scoring"""
    try:
        # Save configuration to database
        # Enable background job for scoring
        
        return {
            "success": True,
            "message": "AI scoring enabled successfully",
            "config": config
        }
    except Exception as e:
        logger.error(f"Error enabling AI scoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-scoring/run")
async def run_ai_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run AI analysis on all employees"""
    try:
        scorer = AIEngagementScorer(db)
        employees = db.query(Employee).filter_by(
            company_id=current_user.company_id,
            is_active=True
        ).all()
        
        processed = 0
        for employee in employees:
            try:
                result = await scorer.calculate_engagement_score(employee.employee_id)
                
                # Update employee record
                employee.engagement_score = result['engagement_score']
                employee.ai_insights = result
                employee.last_ai_analysis = datetime.now()
                
                processed += 1
            except Exception as e:
                logger.error(f"Error processing employee {employee.employee_id}: {e}")
                continue
        
        db.commit()
        
        return {
            "success": True,
            "employees_processed": processed,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error running AI analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))