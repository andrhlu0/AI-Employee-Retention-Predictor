from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import logging

from config import settings
from models import Base
from api.routes import router
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
app.include_router(router, prefix="/api/v1")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}

def create_demo_data():
    """Create some demo employees for testing"""
    from models.employee import Employee
    from datetime import datetime, timedelta
    import random
    
    db = SessionLocal()
    
    # Check if we already have data
    if db.query(Employee).count() > 0:
        db.close()
        return
    
    # Create demo employees
    departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Product']
    positions = ['Senior Developer', 'Marketing Manager', 'Sales Rep', 'HR Specialist', 'Product Manager']
    
    for i in range(20):
        employee = Employee(
            employee_id=f"EMP{i+1:03d}",
            email=f"employee{i+1}@company.com",
            name=f"Employee {i+1}",
            department=random.choice(departments),
            position=random.choice(positions),
            manager_id=f"MGR{random.randint(1, 5):03d}",
            hire_date=datetime.now() - timedelta(days=random.randint(180, 1800)),
            slack_user_id=f"U{i+1:09d}",
            calendar_id=f"cal_{i+1}@company.com",
            current_risk_score=random.uniform(0.1, 0.95),
            risk_factors={
                "declining_communication": random.choice(["low", "medium", "high"]),
                "burnout_risk": random.choice(["low", "medium", "high"]),
                "negative_sentiment": random.choice(["low", "medium", "high"])
            },
            is_active=True
        )
        db.add(employee)
    
    db.commit()
    db.close()
    logger.info("Demo data created successfully")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)