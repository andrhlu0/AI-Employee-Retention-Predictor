# backend/services/credential_manager.py
import json
import logging
from typing import Dict, Optional, List
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session
from datetime import datetime
import os
import base64

from models.company import Company
from integrations.hris_connectors import (
    BambooHRConnector,
    WorkdayConnector,
    ADPConnector,
    SuccessFactorsConnector,
    HRISConnector
)

logger = logging.getLogger(__name__)

class CredentialManager:
    """Manages encrypted storage and retrieval of integration credentials for each company"""
    
    def __init__(self):
        # Generate or load encryption key
        self.encryption_key = self._get_or_create_key()
        self.cipher = Fernet(self.encryption_key)
        self.connectors: Dict[str, Dict[int, HRISConnector]] = {
            'bamboohr': {},
            'workday': {},
            'adp': {},
            'successfactors': {}
        }
    
    def _get_or_create_key(self) -> bytes:
        """Get or create encryption key for credentials"""
        key_file = 'credentials.key'
        
        # In production, use a key management service (AWS KMS, Azure Key Vault, etc.)
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            logger.info("Generated new encryption key for credentials")
            return key
    
    def encrypt_credentials(self, credentials: Dict) -> str:
        """Encrypt credentials dictionary"""
        try:
            json_str = json.dumps(credentials)
            encrypted = self.cipher.encrypt(json_str.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Error encrypting credentials: {e}")
            raise
    
    def decrypt_credentials(self, encrypted_creds: str) -> Dict:
        """Decrypt credentials string"""
        try:
            decoded = base64.b64decode(encrypted_creds.encode())
            decrypted = self.cipher.decrypt(decoded)
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"Error decrypting credentials: {e}")
            raise
    
    def save_hris_credentials(self, company_id: int, system: str, 
                            credentials: Dict, db: Session) -> bool:
        """Save HRIS credentials for a company"""
        try:
            company = db.query(Company).filter(Company.id == company_id).first()
            if not company:
                raise ValueError(f"Company {company_id} not found")
            
            # Encrypt credentials
            encrypted = self.encrypt_credentials(credentials)
            
            # Initialize integrations dict if needed
            if not company.integrations:
                company.integrations = {}
            
            # Store encrypted credentials
            company.integrations[system] = {
                'credentials': encrypted,
                'connected': False,
                'connected_at': None,
                'last_sync': None,
                'error': None
            }
            
            db.commit()
            logger.info(f"Saved {system} credentials for company {company_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving credentials: {e}")
            db.rollback()
            return False
    
    def get_hris_connector(self, company_id: int, system: str, 
                          db: Session) -> Optional[HRISConnector]:
        """Get or create HRIS connector for a company"""
        try:
            # Check if connector already exists in memory
            if system in self.connectors and company_id in self.connectors[system]:
                connector = self.connectors[system][company_id]
                if connector.authenticated:
                    return connector
            
            # Get credentials from database
            company = db.query(Company).filter(Company.id == company_id).first()
            if not company or not company.integrations or system not in company.integrations:
                logger.warning(f"No {system} credentials found for company {company_id}")
                return None
            
            integration_data = company.integrations[system]
            if 'credentials' not in integration_data:
                logger.warning(f"No credentials stored for {system}")
                return None
            
            # Decrypt credentials
            credentials = self.decrypt_credentials(integration_data['credentials'])
            
            # Create connector based on system
            connector = self._create_connector(system, credentials)
            
            if connector:
                # Authenticate
                if connector.authenticate():
                    # Cache the connector
                    if system not in self.connectors:
                        self.connectors[system] = {}
                    self.connectors[system][company_id] = connector
                    
                    # Update connection status in database
                    company.integrations[system]['connected'] = True
                    company.integrations[system]['connected_at'] = datetime.now().isoformat()
                    company.integrations[system]['error'] = None
                    db.commit()
                    
                    logger.info(f"Successfully connected to {system} for company {company_id}")
                    return connector
                else:
                    # Update error status
                    company.integrations[system]['connected'] = False
                    company.integrations[system]['error'] = "Authentication failed"
                    db.commit()
                    logger.error(f"Failed to authenticate with {system} for company {company_id}")
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting HRIS connector: {e}")
            return None
    
    def _create_connector(self, system: str, credentials: Dict) -> Optional[HRISConnector]:
        """Create HRIS connector instance"""
        try:
            if system == 'bamboohr':
                return BambooHRConnector(
                    api_key=credentials.get('api_key'),
                    subdomain=credentials.get('subdomain')
                )
            elif system == 'workday':
                return WorkdayConnector(
                    client_id=credentials.get('client_id'),
                    client_secret=credentials.get('client_secret'),
                    tenant=credentials.get('tenant'),
                    refresh_token=credentials.get('refresh_token')
                )
            elif system == 'adp':
                return ADPConnector(
                    client_id=credentials.get('client_id'),
                    client_secret=credentials.get('client_secret')
                )
            elif system == 'successfactors':
                return SuccessFactorsConnector(
                    company_id=credentials.get('company_id'),
                    api_key=credentials.get('api_key'),
                    username=credentials.get('username')
                )
            else:
                logger.error(f"Unknown system: {system}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating connector for {system}: {e}")
            return None
    
    def test_connection(self, company_id: int, system: str, 
                       credentials: Dict, db: Session) -> Dict:
        """Test HRIS connection without saving"""
        try:
            connector = self._create_connector(system, credentials)
            if not connector:
                return {
                    'success': False,
                    'error': 'Failed to create connector'
                }
            
            if connector.authenticate():
                # Try to fetch a single employee to verify permissions
                try:
                    employees = connector.fetch_employees()
                    employee_count = len(employees) if employees else 0
                    
                    return {
                        'success': True,
                        'message': f'Successfully connected to {system}',
                        'employee_count': employee_count
                    }
                except Exception as e:
                    return {
                        'success': False,
                        'error': f'Connected but cannot fetch data: {str(e)}'
                    }
            else:
                return {
                    'success': False,
                    'error': 'Authentication failed. Please check your credentials.'
                }
                
        except Exception as e:
            logger.error(f"Error testing connection: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def remove_credentials(self, company_id: int, system: str, db: Session) -> bool:
        """Remove stored credentials for a system"""
        try:
            company = db.query(Company).filter(Company.id == company_id).first()
            if company and company.integrations and system in company.integrations:
                del company.integrations[system]
                db.commit()
                
                # Remove from cache
                if system in self.connectors and company_id in self.connectors[system]:
                    del self.connectors[system][company_id]
                
                logger.info(f"Removed {system} credentials for company {company_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error removing credentials: {e}")
            db.rollback()
            return False
    
    def get_all_connectors(self, company_id: int, db: Session) -> Dict[str, HRISConnector]:
        """Get all configured connectors for a company"""
        connectors = {}
        
        for system in ['bamboohr', 'workday', 'adp', 'successfactors']:
            connector = self.get_hris_connector(company_id, system, db)
            if connector:
                connectors[system] = connector
        
        return connectors
    
    def sync_all_employees(self, company_id: int, db: Session) -> Dict:
        """Sync employees from all configured HRIS systems"""
        results = {
            'total_synced': 0,
            'systems': {},
            'errors': []
        }
        
        connectors = self.get_all_connectors(company_id, db)
        
        for system, connector in connectors.items():
            try:
                employees = connector.fetch_employees()
                results['systems'][system] = {
                    'count': len(employees),
                    'success': True
                }
                results['total_synced'] += len(employees)
                
                # Update last sync time
                company = db.query(Company).filter(Company.id == company_id).first()
                if company.integrations and system in company.integrations:
                    company.integrations[system]['last_sync'] = datetime.now().isoformat()
                    db.commit()
                    
            except Exception as e:
                logger.error(f"Error syncing from {system}: {e}")
                results['systems'][system] = {
                    'count': 0,
                    'success': False,
                    'error': str(e)
                }
                results['errors'].append(f"{system}: {str(e)}")
        
        return results

# Singleton instance
credential_manager = CredentialManager()

class AICredentialManager:
    """Manages AI provider credentials for each company"""
    
    def __init__(self):
        self.encryption_key = self._get_or_create_key()
        self.cipher = Fernet(self.encryption_key)
        # Store AI scorer instances per company
        self.ai_scorers: Dict[int, object] = {}
    
    def _get_or_create_key(self) -> bytes:
        """Get or create encryption key"""
        key_file = 'ai_credentials.key'
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            return key
    
    def save_ai_credentials(self, company_id: int, provider: str, 
                           api_key: str, db: Session) -> bool:
        """Save AI provider credentials for a company"""
        try:
            company = db.query(Company).filter(Company.id == company_id).first()
            if not company:
                raise ValueError(f"Company {company_id} not found")
            
            # Encrypt API key
            encrypted = self.cipher.encrypt(api_key.encode())
            encoded = base64.b64encode(encrypted).decode()
            
            # Initialize settings if needed
            if not company.settings:
                company.settings = {}
            
            # Store encrypted credentials
            company.settings['ai_scoring'] = {
                'provider': provider,
                'api_key': encoded,
                'enabled': True,
                'configured_at': datetime.now().isoformat()
            }
            
            db.commit()
            logger.info(f"Saved {provider} AI credentials for company {company_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving AI credentials: {e}")
            db.rollback()
            return False
    
    def get_ai_scorer(self, company_id: int, db: Session):
        """Get AI scorer instance for a company"""
        try:
            # Check cache
            if company_id in self.ai_scorers:
                return self.ai_scorers[company_id]
            
            # Get credentials from database
            company = db.query(Company).filter(Company.id == company_id).first()
            if not company or not company.settings or 'ai_scoring' not in company.settings:
                logger.warning(f"No AI scoring configured for company {company_id}")
                return None
            
            ai_config = company.settings['ai_scoring']
            if not ai_config.get('enabled'):
                return None
            
            # Decrypt API key
            encoded = ai_config.get('api_key')
            if not encoded:
                return None
            
            decoded = base64.b64decode(encoded.encode())
            api_key = self.cipher.decrypt(decoded).decode()
            
            # Create AI scorer instance
            from services.ai_engagement_scorer import AIEngagementScorer
            scorer = AIEngagementScorer()
            
            if ai_config['provider'] == 'openai':
                scorer.openai_api_key = api_key
                scorer.use_openai = True
            elif ai_config['provider'] == 'anthropic':
                scorer.anthropic_api_key = api_key
                scorer.use_anthropic = True
            
            # Cache the scorer
            self.ai_scorers[company_id] = scorer
            
            return scorer
            
        except Exception as e:
            logger.error(f"Error getting AI scorer: {e}")
            return None
    
    def test_ai_connection(self, provider: str, api_key: str) -> Dict:
        """Test AI provider connection"""
        try:
            from services.ai_engagement_scorer import AIEngagementScorer
            scorer = AIEngagementScorer()
            
            if provider == 'openai':
                scorer.openai_api_key = api_key
                scorer.use_openai = True
            elif provider == 'anthropic':
                scorer.anthropic_api_key = api_key
                scorer.use_anthropic = True
            else:
                return {
                    'success': False,
                    'error': 'Invalid provider'
                }
            
            # Test with minimal data
            test_data = {
                'employee_id': 'test',
                'slack_metrics': {'message_count': 100}
            }
            
            # Run async test
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(scorer.calculate_engagement_score(test_data))
            
            if result and 'engagement_score' in result:
                return {
                    'success': True,
                    'message': f'Successfully connected to {provider}'
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to get response from AI'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Singleton instance
ai_credential_manager = AICredentialManager()