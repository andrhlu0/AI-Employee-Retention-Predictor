import ldap
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class ActiveDirectorySync:
    """Sync employee data from Active Directory"""
    
    def __init__(self, server: str, username: str, password: str, base_dn: str):
        self.server = server
        self.username = username
        self.password = password
        self.base_dn = base_dn
    
    def fetch_employees(self) -> List[Dict]:
        """Fetch all employees from AD"""
        try:
            # Connect to LDAP
            conn = ldap.initialize(f"ldap://{self.server}")
            conn.simple_bind_s(self.username, self.password)
            
            # Search for all users
            search_filter = "(&(objectClass=user)(objectCategory=person))"
            attributes = [
                'sAMAccountName', 'mail', 'displayName', 
                'department', 'title', 'manager', 'whenCreated'
            ]
            
            result = conn.search_s(
                self.base_dn,
                ldap.SCOPE_SUBTREE,
                search_filter,
                attributes
            )
            
            employees = []
            for dn, attrs in result:
                if attrs:
                    employees.append({
                        'employee_id': attrs.get('sAMAccountName', [b''])[0].decode(),
                        'email': attrs.get('mail', [b''])[0].decode(),
                        'name': attrs.get('displayName', [b''])[0].decode(),
                        'department': attrs.get('department', [b''])[0].decode(),
                        'position': attrs.get('title', [b''])[0].decode(),
                        'manager_id': self._extract_manager_id(attrs.get('manager', [b''])[0].decode()),
                        'hire_date': attrs.get('whenCreated', [b''])[0].decode()
                    })
            
            conn.unbind()
            return employees
            
        except Exception as e:
            logger.error(f"AD sync error: {e}")
            return []
    
    def _extract_manager_id(self, manager_dn: str) -> str:
        """Extract manager ID from DN"""
        # Parse CN from manager DN
        if manager_dn:
            parts = manager_dn.split(',')
            for part in parts:
                if part.startswith('CN='):
                    return part[3:]
        return ''