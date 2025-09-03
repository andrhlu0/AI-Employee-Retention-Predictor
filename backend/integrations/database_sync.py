from sqlalchemy import create_engine, text
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class DatabaseSync:
    """Sync employee data from external databases"""
    
    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)
    
    def sync_from_hr_database(self, query: str = None) -> List[Dict]:
        """Sync employees from HR database"""
        
        default_query = """
        SELECT 
            employee_id,
            email,
            first_name || ' ' || last_name as name,
            department,
            job_title as position,
            manager_id,
            hire_date,
            status
        FROM employees
        WHERE status = 'ACTIVE'
        """
        
        query = query or default_query
        
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                employees = []
                
                for row in result:
                    employees.append({
                        'employee_id': row.employee_id,
                        'email': row.email,
                        'name': row.name,
                        'department': row.department,
                        'position': row.position,
                        'manager_id': row.manager_id,
                        'hire_date': row.hire_date
                    })
                
                return employees
                
        except Exception as e:
            logger.error(f"Database sync error: {e}")
            return []