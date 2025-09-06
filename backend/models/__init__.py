from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models in the correct order to avoid circular dependencies
from .company import Company
from .user import User
from .employee import Employee
from .prediction import Prediction

__all__ = ['Base', 'Company', 'User', 'Employee', 'Prediction']