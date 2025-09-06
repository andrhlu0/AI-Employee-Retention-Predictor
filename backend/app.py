from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import logging
from datetime import datetime, timedelta
import random

from config import settings
from models import Base
from models.user import User
from models.company import Company
from models.employee import Employee
from models.prediction import Prediction
from api.routes import router
from api.auth_routes import auth_router
from api.upload_routes import upload_router
from services.ml_predictor import MLPredictor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup - handle SQLite differently
if "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL, 
        connect_args={"check_same_thread": False}  # Needed for SQLite
    )
else:
    engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Retention Predictor")
    # Initialize ML model
    predictor = MLPredictor()
    predictor.load_model()
    
    # Create some demo data
    create_demo_data()
    
    yield
    # Shutdown
    logger.info("Shutting down AI Retention Predictor")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Include API routes
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(router, prefix="/api/v1", tags=["api"])
app.include_router(upload_router, prefix="/api/v1", tags=["upload"])

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}

def create_demo_data():
    """Create demo company and users for testing"""
    from auth.auth_handler import auth_handler
    
    db = SessionLocal()
    
    try:
        # Check if we already have a demo company
        demo_company = db.query(Company).filter(Company.domain == "demo.com").first()
        
        if not demo_company:
            # Create demo company
            demo_company = Company(
                company_id="COMP12345678",
                name="Demo Company",
                domain="demo.com",
                subscription_plan="trial",
                billing_email="admin@demo.com",
                trial_ends_at=datetime.utcnow() + timedelta(days=30)
            )
            db.add(demo_company)
            
            # Create demo admin user
            demo_admin = User(
                email="admin@demo.com",
                hashed_password=auth_handler.get_password_hash("demo123"),
                full_name="Demo Admin",
                role="admin",
                company_id="COMP12345678",
                can_view_all_employees=True,
                can_run_predictions=True,
                can_manage_interventions=True,
                can_manage_company=True,
                is_active=True,
                is_verified=True
            )
            db.add(demo_admin)
            
            # Create demo HR user
            demo_hr = User(
                email="hr@demo.com",
                hashed_password=auth_handler.get_password_hash("demo123"),
                full_name="Demo HR",
                role="hr",
                company_id="COMP12345678",
                can_view_all_employees=True,
                can_run_predictions=False,
                can_manage_interventions=True,
                can_manage_company=False,
                is_active=True,
                is_verified=True
            )
            db.add(demo_hr)
            
            db.commit()
            logger.info("Demo company and users created successfully")
            logger.info("Login with: admin@demo.com / demo123")
        
        # Check if we already have demo employees
        if db.query(Employee).count() == 0:
            # Create demo employees
            departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Product']
            positions = ['Junior', 'Senior', 'Lead', 'Manager', 'Director']
            
            for i in range(50):
                department = random.choice(departments)
                position = random.choice(positions)
                
                employee = Employee(
                    employee_id=f"EMP{str(i+1).zfill(5)}",
                    email=f"employee{i+1}@demo.com",
                    name=f"Employee {i+1}",
                    department=department,
                    position=f"{position} {department}",
                    manager_id=f"EMP{str(random.randint(1, 10)).zfill(5)}",
                    hire_date=datetime.now() - timedelta(days=random.randint(30, 1825)),
                    salary=random.randint(50000, 150000),
                    performance_score=random.uniform(2.5, 5.0),
                    engagement_score=random.uniform(2.0, 5.0),
                    company_id="COMP12345678",
                    is_active=True,
                    current_risk_score=random.uniform(0.1, 0.95),
                    risk_factors=["Low engagement", "High workload", "Market competitiveness"][:random.randint(0, 3)]
                )
                db.add(employee)
            
            # Create a few predictions for demo
            for i in range(10):
                prediction = Prediction(
                    employee_id=f"EMP{str(random.randint(1, 50)).zfill(5)}",
                    prediction_date=datetime.now() - timedelta(days=random.randint(1, 30)),
                    risk_score=random.uniform(0.1, 0.95),
                    confidence_score=random.uniform(0.7, 0.99),
                    prediction_horizon_days=90,
                    risk_factors=["Low engagement", "High workload", "Market competitiveness"][:random.randint(1, 3)],
                    model_version="v1.0"
                )
                db.add(prediction)
            
            db.commit()
            logger.info("Demo employees created successfully")
            
    except Exception as e:
        logger.error(f"Error creating demo data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)