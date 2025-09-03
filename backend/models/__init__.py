from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

from .employee import Employee
from .prediction import Prediction

__all__ = ['Base', 'Employee', 'Prediction']