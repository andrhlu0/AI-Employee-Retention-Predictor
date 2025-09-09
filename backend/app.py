# backend/app.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timedelta

from database import engine, Base, get_db
from config import settings
from auth.auth_router import router as auth_router
from api.v1.employees import router as employees_router
from api.v1.predictions import router as predictions_router
from api.v1.analytics import router as analytics_router
from api.v1.upload import router as upload_router
from api.v1.integrations import router as integrations_router
from billing.billing_router import router as billing_router  # ADD THIS LINE

# Import models to ensure they're registered
from models import User, Company, Employee, Prediction
from models.subscription import Subscription, Invoice, UsageRecord, FeatureFlag  # ADD THIS LINE

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting up AI Employee Retention Predictor...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Initialize demo data if needed
    from sqlalchemy.orm import Session
    from models.subscription import PlanTier
    db = next(get_db())
    
    try:
        # Check if demo company exists, if not create it
        demo_company = db.query(Company).filter(Company.domain == "demo.com").first()
        if not demo_company and settings.CREATE_DEMO_DATA:
            from auth.auth_handler import auth_handler
            
            # Create demo company with trial plan
            demo_company = Company(
                name="Demo Company",
                domain="demo.com",
                industry="Technology",
                size="50-200",
                plan_tier=PlanTier.TRIAL,  # ADD THIS
                trial_ends_at=datetime.utcnow() + timedelta(days=14),  # ADD THIS
                created_at=datetime.utcnow()
            )
            db.add(demo_company)
            db.commit()
            
            # Create demo admin user
            hashed_password = auth_handler.get_password_hash("demo123")
            demo_user = User(
                email="admin@demo.com",
                username="admin",
                full_name="Demo Admin",
                hashed_password=hashed_password,
                company_id=demo_company.id,
                role="admin",
                is_active=True
            )
            db.add(demo_user)
            
            # Create demo subscription
            demo_subscription = Subscription(
                company_id=demo_company.id,
                plan_tier=PlanTier.TRIAL,
                is_active=True,
                started_at=datetime.utcnow(),
                trial_ends_at=datetime.utcnow() + timedelta(days=14)
            )
            db.add(demo_subscription)
            
            db.commit()
            logger.info("Demo data created successfully")
    except Exception as e:
        logger.error(f"Error creating demo data: {e}")
        db.rollback()
    finally:
        db.close()
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered employee retention prediction system with subscription management",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Include routers
app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(predictions_router)
app.include_router(analytics_router)
app.include_router(upload_router)
app.include_router(integrations_router)
app.include_router(billing_router)  # ADD THIS LINE

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "AI Employee Retention Predictor API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": settings.APP_VERSION
    }

# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD
    )