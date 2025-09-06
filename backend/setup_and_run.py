#!/usr/bin/env python
"""
Setup and run script for AI Employee Retention Predictor
This script ensures the database is properly initialized before starting the app
"""

import os
import sys
import logging
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required packages are installed"""
    # Map of package name to import name
    package_imports = {
        'fastapi': 'fastapi',
        'uvicorn': 'uvicorn',
        'sqlalchemy': 'sqlalchemy',
        'passlib': 'passlib.context',
        'python-jose': 'jose',
        'pydantic': 'pydantic',
        'pandas': 'pandas',
        'numpy': 'numpy',
        'scikit-learn': 'sklearn',
        'xgboost': 'xgboost'
    }
    
    missing_packages = []
    for package, import_name in package_imports.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing required packages: {', '.join(missing_packages)}")
        logger.info("Please install them using:")
        logger.info(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def setup_database():
    """Initialize database and create tables"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from config import settings
    
    logger.info("Setting up database...")
    
    # Create engine
    if "sqlite" in settings.DATABASE_URL:
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(settings.DATABASE_URL)
    
    # Import all models to ensure they're registered
    from models import Base, User, Company, Employee, Prediction
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
    
    # Create demo data
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        from auth.auth_handler import auth_handler
        from datetime import datetime, timedelta
        
        # Check if demo company exists
        demo_company = db.query(Company).filter(Company.domain == "demo.com").first()
        
        if not demo_company:
            logger.info("Creating demo company and users...")
            
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
                is_verified=True,
                onboarding_completed=True
            )
            db.add(demo_admin)
            
            db.commit()
            logger.info("Demo data created successfully!")
            logger.info("=" * 50)
            logger.info("Demo Login Credentials:")
            logger.info("Email: admin@demo.com")
            logger.info("Password: demo123")
            logger.info("=" * 50)
        else:
            logger.info("Demo data already exists")
            
    except Exception as e:
        logger.error(f"Error creating demo data: {e}")
        db.rollback()
    finally:
        db.close()

def create_ml_model_directory():
    """Create directory for ML models"""
    model_dir = "models"
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        logger.info(f"Created {model_dir} directory for ML models")

def run_application():
    """Run the FastAPI application"""
    logger.info("Starting AI Employee Retention Predictor...")
    
    import uvicorn
    from app import app
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

def main():
    """Main setup and run function"""
    logger.info("AI Employee Retention Predictor - Setup")
    logger.info("=" * 50)
    
    # Check dependencies
    logger.info("Checking dependencies...")
    if not check_dependencies():
        sys.exit(1)
    logger.info("All dependencies are installed ✓")
    
    # Setup database
    setup_database()
    
    # Create ML model directory
    create_ml_model_directory()
    
    # Run the application
    logger.info("\nStarting application server...")
    logger.info("Backend will be available at: http://localhost:8000")
    logger.info("API documentation at: http://localhost:8000/docs")
    logger.info("\nPress CTRL+C to stop the server")
    logger.info("=" * 50)
    
    run_application()

if __name__ == "__main__":
    main()