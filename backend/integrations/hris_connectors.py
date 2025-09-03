import requests
from typing import List, Dict
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class HRISConnector(ABC):
    """Base class for HRIS integrations"""
    
    @abstractmethod
    def fetch_employees(self) -> List[Dict]:
        pass
    
    @abstractmethod
    def fetch_employee_details(self, employee_id: str) -> Dict:
        pass

class WorkdayConnector(HRISConnector):
    """Workday HRIS Integration"""
    
    def __init__(self, tenant_url: str, api_key: str, api_secret: str):
        self.tenant_url = tenant_url
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = f"https://{tenant_url}/api/v1"
        
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from Workday"""
        try:
            headers = {
                'Authorization': f'Bearer {self._get_access_token()}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.base_url}/workers",
                headers=headers
            )
            
            if response.status_code == 200:
                workers = response.json()['workers']
                
                # Transform to our format
                employees = []
                for worker in workers:
                    employees.append({
                        'employee_id': worker['workerID'],
                        'email': worker['emailAddress'],
                        'name': f"{worker['firstName']} {worker['lastName']}",
                        'department': worker['department'],
                        'position': worker['jobTitle'],
                        'manager_id': worker.get('managerID'),
                        'hire_date': worker['hireDate'],
                        'location': worker.get('location'),
                        'employment_status': worker['status']
                    })
                
                return employees
                
        except Exception as e:
            logger.error(f"Error fetching from Workday: {e}")
            return []
    
    def _get_access_token(self) -> str:
        """Get OAuth token for Workday API"""
        # Implementation for OAuth flow
        pass

class BambooHRConnector(HRISConnector):
    """BambooHR Integration"""
    
    def __init__(self, company_domain: str, api_key: str):
        self.company_domain = company_domain
        self.api_key = api_key
        self.base_url = f"https://api.bamboohr.com/api/gateway.php/{company_domain}/v1"
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from BambooHR"""
        try:
            response = requests.get(
                f"{self.base_url}/employees/directory",
                auth=(self.api_key, 'x')
            )
            
            if response.status_code == 200:
                employees_data = response.json()['employees']
                
                employees = []
                for emp in employees_data:
                    employees.append({
                        'employee_id': emp['id'],
                        'email': emp['workEmail'],
                        'name': emp['displayName'],
                        'department': emp['department'],
                        'position': emp['jobTitle'],
                        'manager_id': emp.get('supervisorId'),
                        'hire_date': emp['hireDate']
                    })
                
                return employees
                
        except Exception as e:
            logger.error(f"Error fetching from BambooHR: {e}")
            return []

class ADPConnector(HRISConnector):
    """ADP Workforce Now Integration"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://api.adp.com"
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch employees from ADP"""
        # ADP API implementation
        pass

class SuccessFactorsConnector(HRISConnector):
    """SAP SuccessFactors Integration"""
    
    def __init__(self, company_id: str, api_key: str):
        self.company_id = company_id
        self.api_key = api_key
        self.base_url = f"https://api.successfactors.com/odata/v2"
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch employees from SuccessFactors"""
        # SuccessFactors OData API implementation
        pass