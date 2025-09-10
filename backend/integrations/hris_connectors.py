# backend/integrations/hris_connectors.py
import logging
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
import base64
import json
import os

logger = logging.getLogger(__name__)

class HRISConnector(ABC):
    """Abstract base class for HRIS integrations"""
    
    @abstractmethod
    def authenticate(self) -> bool:
        """Authenticate with the HRIS system"""
        pass
    
    @abstractmethod
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from HRIS"""
        pass
    
    @abstractmethod
    def fetch_employee(self, employee_id: str) -> Optional[Dict]:
        """Fetch single employee data"""
        pass
    
    @abstractmethod
    def fetch_time_off(self, employee_id: str = None) -> List[Dict]:
        """Fetch time off data"""
        pass
    
    @abstractmethod
    def fetch_performance(self, employee_id: str = None) -> List[Dict]:
        """Fetch performance review data"""
        pass

class BambooHRConnector(HRISConnector):
    """BambooHR Integration"""
    
    def __init__(self, api_key: str, subdomain: str):
        self.api_key = api_key
        self.subdomain = subdomain
        self.base_url = f"https://api.bamboohr.com/api/gateway.php/{subdomain}/v1"
        self.session = requests.Session()
        self.authenticated = False
    
    def authenticate(self) -> bool:
        """Authenticate with BambooHR using API key"""
        try:
            # BambooHR uses Basic Auth with API key as username
            auth_string = f"{self.api_key}:x"
            encoded = base64.b64encode(auth_string.encode()).decode()
            self.session.headers.update({
                'Authorization': f'Basic {encoded}',
                'Accept': 'application/json'
            })
            
            # Test authentication
            response = self.session.get(f"{self.base_url}/employees/directory")
            self.authenticated = response.status_code == 200
            return self.authenticated
            
        except Exception as e:
            logger.error(f"BambooHR authentication failed: {e}")
            return False
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from BambooHR"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            # Define fields to fetch
            fields = [
                'id', 'displayName', 'firstName', 'lastName', 'workEmail',
                'department', 'division', 'jobTitle', 'location', 'supervisor',
                'hireDate', 'employmentStatus', 'workPhone', 'mobilePhone'
            ]
            
            response = self.session.get(
                f"{self.base_url}/employees/directory",
                params={'fields': ','.join(fields)}
            )
            
            if response.status_code == 200:
                employees_data = response.json().get('employees', [])
                
                employees = []
                for emp in employees_data:
                    employees.append(self._normalize_employee_data(emp))
                
                logger.info(f"Fetched {len(employees)} employees from BambooHR")
                return employees
            else:
                logger.error(f"Failed to fetch employees: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching from BambooHR: {e}")
            return []
    
    def fetch_employee(self, employee_id: str) -> Optional[Dict]:
        """Fetch single employee from BambooHR"""
        if not self.authenticated:
            if not self.authenticate():
                return None
        
        try:
            response = self.session.get(f"{self.base_url}/employees/{employee_id}")
            
            if response.status_code == 200:
                return self._normalize_employee_data(response.json())
            else:
                logger.error(f"Failed to fetch employee {employee_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching employee from BambooHR: {e}")
            return None
    
    def fetch_time_off(self, employee_id: str = None) -> List[Dict]:
        """Fetch time off requests from BambooHR"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            # Get time off requests for the last year
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
            end_date = datetime.now().strftime('%Y-%m-%d')
            
            url = f"{self.base_url}/time_off/requests"
            params = {
                'start': start_date,
                'end': end_date
            }
            
            if employee_id:
                params['employeeId'] = employee_id
            
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                time_off_data = response.json()
                return self._normalize_time_off_data(time_off_data)
            else:
                logger.error(f"Failed to fetch time off: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching time off from BambooHR: {e}")
            return []
    
    def fetch_performance(self, employee_id: str = None) -> List[Dict]:
        """Fetch performance data from BambooHR"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            # BambooHR doesn't have a standard performance API
            # This would need custom fields or integration with their performance module
            
            if employee_id:
                url = f"{self.base_url}/employees/{employee_id}/tables/performanceReviews"
            else:
                # Would need to iterate through employees
                return []
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Performance data not available: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching performance from BambooHR: {e}")
            return []
    
    def _normalize_employee_data(self, emp: Dict) -> Dict:
        """Normalize BambooHR employee data to standard format"""
        return {
            'employee_id': emp.get('id'),
            'email': emp.get('workEmail'),
            'name': emp.get('displayName'),
            'first_name': emp.get('firstName'),
            'last_name': emp.get('lastName'),
            'department': emp.get('department'),
            'division': emp.get('division'),
            'position': emp.get('jobTitle'),
            'location': emp.get('location'),
            'manager_id': emp.get('supervisor'),
            'hire_date': emp.get('hireDate'),
            'employment_status': emp.get('employmentStatus'),
            'work_phone': emp.get('workPhone'),
            'mobile_phone': emp.get('mobilePhone'),
            'source': 'bamboohr'
        }
    
    def _normalize_time_off_data(self, time_off: List[Dict]) -> List[Dict]:
        """Normalize time off data"""
        normalized = []
        for request in time_off:
            normalized.append({
                'employee_id': request.get('employeeId'),
                'type': request.get('type', {}).get('name'),
                'status': request.get('status'),
                'start_date': request.get('start'),
                'end_date': request.get('end'),
                'days': request.get('amount'),
                'notes': request.get('notes'),
                'created_at': request.get('created')
            })
        return normalized

class WorkdayConnector(HRISConnector):
    """Workday Integration"""
    
    def __init__(self, client_id: str, client_secret: str, tenant: str, refresh_token: str = None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.tenant = tenant
        self.refresh_token = refresh_token
        self.base_url = f"https://wd2-impl-services1.workday.com/ccx/service/{tenant}"
        self.access_token = None
        self.session = requests.Session()
        self.authenticated = False
    
    def authenticate(self) -> bool:
        """Authenticate with Workday using OAuth2"""
        try:
            # Workday uses OAuth2 for authentication
            auth_url = f"https://wd2-impl-services1.workday.com/{self.tenant}/oauth2/token"
            
            if self.refresh_token:
                # Use refresh token if available
                data = {
                    'grant_type': 'refresh_token',
                    'refresh_token': self.refresh_token,
                    'client_id': self.client_id,
                    'client_secret': self.client_secret
                }
            else:
                # Use client credentials
                data = {
                    'grant_type': 'client_credentials',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'scope': 'tenant'
                }
            
            response = requests.post(auth_url, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                self.refresh_token = token_data.get('refresh_token', self.refresh_token)
                
                self.session.headers.update({
                    'Authorization': f'Bearer {self.access_token}',
                    'Content-Type': 'application/json'
                })
                
                self.authenticated = True
                logger.info("Successfully authenticated with Workday")
                return True
            else:
                logger.error(f"Workday authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error authenticating with Workday: {e}")
            return False
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from Workday"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            # Workday REST API endpoint for workers
            url = f"{self.base_url}/v1/workers"
            
            params = {
                'limit': 100,
                'offset': 0
            }
            
            all_employees = []
            
            while True:
                response = self.session.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    workers = data.get('data', [])
                    
                    for worker in workers:
                        all_employees.append(self._normalize_workday_employee(worker))
                    
                    # Check if there are more pages
                    if len(workers) < params['limit']:
                        break
                    
                    params['offset'] += params['limit']
                else:
                    logger.error(f"Failed to fetch Workday employees: {response.status_code}")
                    break
            
            logger.info(f"Fetched {len(all_employees)} employees from Workday")
            return all_employees
            
        except Exception as e:
            logger.error(f"Error fetching from Workday: {e}")
            return []
    
    def fetch_employee(self, employee_id: str) -> Optional[Dict]:
        """Fetch single employee from Workday"""
        if not self.authenticated:
            if not self.authenticate():
                return None
        
        try:
            url = f"{self.base_url}/v1/workers/{employee_id}"
            response = self.session.get(url)
            
            if response.status_code == 200:
                worker = response.json()
                return self._normalize_workday_employee(worker)
            else:
                logger.error(f"Failed to fetch employee {employee_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching employee from Workday: {e}")
            return None
    
    def fetch_time_off(self, employee_id: str = None) -> List[Dict]:
        """Fetch time off data from Workday"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            if employee_id:
                url = f"{self.base_url}/v1/workers/{employee_id}/timeOff"
            else:
                url = f"{self.base_url}/v1/timeOff"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                time_off_data = response.json().get('data', [])
                return self._normalize_workday_time_off(time_off_data)
            else:
                logger.warning(f"Time off data not available: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching time off from Workday: {e}")
            return []
    
    def fetch_performance(self, employee_id: str = None) -> List[Dict]:
        """Fetch performance reviews from Workday"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            if employee_id:
                url = f"{self.base_url}/v1/workers/{employee_id}/performanceReviews"
            else:
                url = f"{self.base_url}/v1/performanceReviews"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                reviews = response.json().get('data', [])
                return self._normalize_workday_performance(reviews)
            else:
                logger.warning(f"Performance data not available: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching performance from Workday: {e}")
            return []
    
    def _normalize_workday_employee(self, worker: Dict) -> Dict:
        """Normalize Workday employee data"""
        return {
            'employee_id': worker.get('id'),
            'email': worker.get('primaryWorkEmail'),
            'name': f"{worker.get('firstName', '')} {worker.get('lastName', '')}".strip(),
            'first_name': worker.get('firstName'),
            'last_name': worker.get('lastName'),
            'department': worker.get('department', {}).get('descriptor'),
            'division': worker.get('businessUnit', {}).get('descriptor'),
            'position': worker.get('businessTitle'),
            'location': worker.get('location', {}).get('descriptor'),
            'manager_id': worker.get('manager', {}).get('id'),
            'hire_date': worker.get('hireDate'),
            'employment_status': worker.get('workerStatus', {}).get('descriptor'),
            'employee_type': worker.get('workerType', {}).get('descriptor'),
            'source': 'workday'
        }
    
    def _normalize_workday_time_off(self, time_off_data: List[Dict]) -> List[Dict]:
        """Normalize Workday time off data"""
        normalized = []
        for request in time_off_data:
            normalized.append({
                'employee_id': request.get('worker', {}).get('id'),
                'type': request.get('timeOffType', {}).get('descriptor'),
                'status': request.get('status'),
                'start_date': request.get('startDate'),
                'end_date': request.get('endDate'),
                'days': request.get('totalDays'),
                'notes': request.get('comment'),
                'created_at': request.get('requestDate')
            })
        return normalized
    
    def _normalize_workday_performance(self, reviews: List[Dict]) -> List[Dict]:
        """Normalize Workday performance data"""
        normalized = []
        for review in reviews:
            normalized.append({
                'employee_id': review.get('worker', {}).get('id'),
                'review_date': review.get('reviewDate'),
                'overall_rating': review.get('overallRating'),
                'review_type': review.get('reviewType', {}).get('descriptor'),
                'reviewer': review.get('reviewer', {}).get('descriptor'),
                'goals_met': review.get('goalsMet'),
                'comments': review.get('comments')
            })
        return normalized

class ADPConnector(HRISConnector):
    """ADP Workforce Now Integration"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://api.adp.com"
        self.access_token = None
        self.session = requests.Session()
        self.authenticated = False
    
    def authenticate(self) -> bool:
        """Authenticate with ADP using OAuth2"""
        try:
            # ADP OAuth2 endpoint
            auth_url = "https://accounts.adp.com/auth/oauth/v2/token"
            
            # Encode credentials
            credentials = f"{self.client_id}:{self.client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            headers = {
                'Authorization': f'Basic {encoded_credentials}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'client_credentials'
            }
            
            response = requests.post(auth_url, headers=headers, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                
                self.session.headers.update({
                    'Authorization': f'Bearer {self.access_token}',
                    'Content-Type': 'application/json'
                })
                
                self.authenticated = True
                logger.info("Successfully authenticated with ADP")
                return True
            else:
                logger.error(f"ADP authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error authenticating with ADP: {e}")
            return False
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from ADP"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            url = f"{self.base_url}/hr/v2/workers"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                workers = data.get('workers', [])
                
                employees = []
                for worker in workers:
                    employees.append(self._normalize_adp_employee(worker))
                
                logger.info(f"Fetched {len(employees)} employees from ADP")
                return employees
            else:
                logger.error(f"Failed to fetch ADP employees: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching from ADP: {e}")
            return []
    
    def fetch_employee(self, employee_id: str) -> Optional[Dict]:
        """Fetch single employee from ADP"""
        if not self.authenticated:
            if not self.authenticate():
                return None
        
        try:
            url = f"{self.base_url}/hr/v2/workers/{employee_id}"
            response = self.session.get(url)
            
            if response.status_code == 200:
                worker = response.json()
                return self._normalize_adp_employee(worker)
            else:
                logger.error(f"Failed to fetch employee {employee_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching employee from ADP: {e}")
            return None
    
    def fetch_time_off(self, employee_id: str = None) -> List[Dict]:
        """Fetch time off data from ADP"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            if employee_id:
                url = f"{self.base_url}/time/v2/workers/{employee_id}/time-off-requests"
            else:
                url = f"{self.base_url}/time/v2/time-off-requests"
            
            response = self.session.get(url)
            
            if response.status_code == 200:
                data = response.json()
                return self._normalize_adp_time_off(data.get('timeOffRequests', []))
            else:
                logger.warning(f"Time off data not available: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching time off from ADP: {e}")
            return []
    
    def fetch_performance(self, employee_id: str = None) -> List[Dict]:
        """Fetch performance data from ADP"""
        # ADP typically doesn't have a standard performance API
        # This would require custom integration with ADP's performance module
        logger.warning("Performance data not available through standard ADP API")
        return []
    
    def _normalize_adp_employee(self, worker: Dict) -> Dict:
        """Normalize ADP employee data"""
        person = worker.get('person', {})
        work_assignment = worker.get('workAssignments', [{}])[0]
        
        return {
            'employee_id': worker.get('associateOID'),
            'email': person.get('communication', {}).get('emails', [{}])[0].get('emailUri'),
            'name': person.get('legalName', {}).get('formattedName'),
            'first_name': person.get('legalName', {}).get('givenName'),
            'last_name': person.get('legalName', {}).get('familyName1'),
            'department': work_assignment.get('assignedOrganizationalUnits', [{}])[0].get('nameCode', {}).get('longName'),
            'position': work_assignment.get('jobTitle'),
            'location': work_assignment.get('assignedWorkLocations', [{}])[0].get('nameCode', {}).get('longName'),
            'manager_id': work_assignment.get('reportsTo', [{}])[0].get('associateOID'),
            'hire_date': work_assignment.get('hireDate'),
            'employment_status': work_assignment.get('workerStatus', {}).get('statusCode', {}).get('codeValue'),
            'source': 'adp'
        }
    
    def _normalize_adp_time_off(self, time_off_data: List[Dict]) -> List[Dict]:
        """Normalize ADP time off data"""
        normalized = []
        for request in time_off_data:
            normalized.append({
                'employee_id': request.get('associateOID'),
                'type': request.get('timeOffCode', {}).get('codeValue'),
                'status': request.get('requestStatusCode', {}).get('codeValue'),
                'start_date': request.get('timeOffPeriod', {}).get('startDate'),
                'end_date': request.get('timeOffPeriod', {}).get('endDate'),
                'days': request.get('timeOffDuration', {}).get('dayDuration'),
                'created_at': request.get('submittedDateTime')
            })
        return normalized

class SuccessFactorsConnector(HRISConnector):
    """SAP SuccessFactors Integration"""
    
    def __init__(self, company_id: str, api_key: str, username: str = None):
        self.company_id = company_id
        self.api_key = api_key
        self.username = username
        self.base_url = f"https://api.successfactors.com/odata/v2"
        self.session = requests.Session()
        self.authenticated = False
    
    def authenticate(self) -> bool:
        """Authenticate with SuccessFactors"""
        try:
            # SuccessFactors uses Basic Auth or OAuth2
            # Using API key authentication here
            auth_string = f"{self.company_id}@{self.username}:{self.api_key}" if self.username else f"{self.company_id}:{self.api_key}"
            encoded = base64.b64encode(auth_string.encode()).decode()
            
            self.session.headers.update({
                'Authorization': f'Basic {encoded}',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            })
            
            # Test authentication with a simple query
            test_url = f"{self.base_url}/User?$top=1"
            response = self.session.get(test_url)
            
            self.authenticated = response.status_code == 200
            
            if self.authenticated:
                logger.info("Successfully authenticated with SuccessFactors")
            else:
                logger.error(f"SuccessFactors authentication failed: {response.status_code}")
            
            return self.authenticated
            
        except Exception as e:
            logger.error(f"Error authenticating with SuccessFactors: {e}")
            return False
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from SuccessFactors"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            # Use OData query to fetch employees
            url = f"{self.base_url}/User"
            params = {
                '$select': 'userId,username,firstName,lastName,email,department,division,title,location,managerId,hireDate,status',
                '$filter': "status eq 'active'",
                '$top': 100
            }
            
            all_employees = []
            skip = 0
            
            while True:
                params['$skip'] = skip
                response = self.session.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    employees = data.get('d', {}).get('results', [])
                    
                    if not employees:
                        break
                    
                    for emp in employees:
                        all_employees.append(self._normalize_sf_employee(emp))
                    
                    skip += 100
                else:
                    logger.error(f"Failed to fetch SuccessFactors employees: {response.status_code}")
                    break
            
            logger.info(f"Fetched {len(all_employees)} employees from SuccessFactors")
            return all_employees
            
        except Exception as e:
            logger.error(f"Error fetching from SuccessFactors: {e}")
            return []
    
    def fetch_employee(self, employee_id: str) -> Optional[Dict]:
        """Fetch single employee from SuccessFactors"""
        if not self.authenticated:
            if not self.authenticate():
                return None
        
        try:
            url = f"{self.base_url}/User('{employee_id}')"
            response = self.session.get(url)
            
            if response.status_code == 200:
                employee = response.json().get('d', {})
                return self._normalize_sf_employee(employee)
            else:
                logger.error(f"Failed to fetch employee {employee_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching employee from SuccessFactors: {e}")
            return None
    
    def fetch_time_off(self, employee_id: str = None) -> List[Dict]:
        """Fetch time off data from SuccessFactors"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            url = f"{self.base_url}/EmployeeTimeOff"
            params = {
                '$select': 'userId,timeType,startDate,endDate,approvalStatus,daysRequested'
            }
            
            if employee_id:
                params['$filter'] = f"userId eq '{employee_id}'"
            
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                time_off = data.get('d', {}).get('results', [])
                return self._normalize_sf_time_off(time_off)
            else:
                logger.warning(f"Time off data not available: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching time off from SuccessFactors: {e}")
            return []
    
    def fetch_performance(self, employee_id: str = None) -> List[Dict]:
        """Fetch performance data from SuccessFactors"""
        if not self.authenticated:
            if not self.authenticate():
                return []
        
        try:
            url = f"{self.base_url}/PerformanceReview"
            params = {
                '$select': 'userId,reviewDate,overallRating,reviewType'
            }
            
            if employee_id:
                params['$filter'] = f"userId eq '{employee_id}'"
            
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                reviews = data.get('d', {}).get('results', [])
                return self._normalize_sf_performance(reviews)
            else:
                logger.warning(f"Performance data not available: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error fetching performance from SuccessFactors: {e}")
            return []
    
    def _normalize_sf_employee(self, emp: Dict) -> Dict:
        """Normalize SuccessFactors employee data"""
        return {
            'employee_id': emp.get('userId'),
            'email': emp.get('email'),
            'name': f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip(),
            'first_name': emp.get('firstName'),
            'last_name': emp.get('lastName'),
            'department': emp.get('department'),
            'division': emp.get('division'),
            'position': emp.get('title'),
            'location': emp.get('location'),
            'manager_id': emp.get('managerId'),
            'hire_date': emp.get('hireDate'),
            'employment_status': emp.get('status'),
            'username': emp.get('username'),
            'source': 'successfactors'
        }
    
    def _normalize_sf_time_off(self, time_off_data: List[Dict]) -> List[Dict]:
        """Normalize SuccessFactors time off data"""
        normalized = []
        for request in time_off_data:
            normalized.append({
                'employee_id': request.get('userId'),
                'type': request.get('timeType'),
                'status': request.get('approvalStatus'),
                'start_date': request.get('startDate'),
                'end_date': request.get('endDate'),
                'days': request.get('daysRequested')
            })
        return normalized
    
    def _normalize_sf_performance(self, reviews: List[Dict]) -> List[Dict]:
        """Normalize SuccessFactors performance data"""
        normalized = []
        for review in reviews:
            normalized.append({
                'employee_id': review.get('userId'),
                'review_date': review.get('reviewDate'),
                'overall_rating': review.get('overallRating'),
                'review_type': review.get('reviewType')
            })
        return normalized

class HRISManager:
    """Manager class to handle multiple HRIS connections"""
    
    def __init__(self):
        self.connectors = {}
        self._initialize_connectors()
    
    def _initialize_connectors(self):
        """Initialize HRIS connectors based on environment variables"""
        
        # BambooHR
        if os.getenv('BAMBOOHR_API_KEY') and os.getenv('BAMBOOHR_SUBDOMAIN'):
            self.connectors['bamboohr'] = BambooHRConnector(
                api_key=os.getenv('BAMBOOHR_API_KEY'),
                subdomain=os.getenv('BAMBOOHR_SUBDOMAIN')
            )
            logger.info("BambooHR connector initialized")
        
        # Workday
        if os.getenv('WORKDAY_CLIENT_ID') and os.getenv('WORKDAY_CLIENT_SECRET'):
            self.connectors['workday'] = WorkdayConnector(
                client_id=os.getenv('WORKDAY_CLIENT_ID'),
                client_secret=os.getenv('WORKDAY_CLIENT_SECRET'),
                tenant=os.getenv('WORKDAY_TENANT')
            )
            logger.info("Workday connector initialized")
        
        # ADP
        if os.getenv('ADP_CLIENT_ID') and os.getenv('ADP_CLIENT_SECRET'):
            self.connectors['adp'] = ADPConnector(
                client_id=os.getenv('ADP_CLIENT_ID'),
                client_secret=os.getenv('ADP_CLIENT_SECRET')
            )
            logger.info("ADP connector initialized")
        
        # SuccessFactors
        if os.getenv('SUCCESSFACTORS_COMPANY_ID') and os.getenv('SUCCESSFACTORS_API_KEY'):
            self.connectors['successfactors'] = SuccessFactorsConnector(
                company_id=os.getenv('SUCCESSFACTORS_COMPANY_ID'),
                api_key=os.getenv('SUCCESSFACTORS_API_KEY')
            )
            logger.info("SuccessFactors connector initialized")
    
    def get_connector(self, system: str) -> Optional[HRISConnector]:
        """Get a specific HRIS connector"""
        return self.connectors.get(system.lower())
    
    def fetch_all_employees(self) -> List[Dict]:
        """Fetch employees from all configured HRIS systems"""
        all_employees = []
        
        for system, connector in self.connectors.items():
            try:
                logger.info(f"Fetching employees from {system}")
                employees = connector.fetch_employees()
                all_employees.extend(employees)
            except Exception as e:
                logger.error(f"Error fetching from {system}: {e}")
        
        return all_employees
    
    def sync_employee_data(self, employee_id: str) -> Optional[Dict]:
        """Sync data for a specific employee across all systems"""
        employee_data = {}
        
        for system, connector in self.connectors.items():
            try:
                data = connector.fetch_employee(employee_id)
                if data:
                    employee_data[system] = data
            except Exception as e:
                logger.error(f"Error syncing employee {employee_id} from {system}: {e}")
        
        return employee_data if employee_data else None