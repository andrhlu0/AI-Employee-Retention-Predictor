import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from textblob import TextBlob
import base64
import re

from config import settings

logger = logging.getLogger(__name__)

class EmailIntegration:
    def __init__(self):
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Gmail API service"""
        try:
            # In production, use OAuth2 flow
            # This is simplified for demo
            creds = Credentials(
                token='access_token',
                refresh_token='refresh_token',
                token_uri='https://oauth2.googleapis.com/token',
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET
            )
            self.service = build('gmail', 'v1', credentials=creds)
        except Exception as e:
            logger.error(f"Error initializing Gmail service: {e}")
    
    def get_email_metrics(self, email: str, start_date: datetime, end_date: datetime) -> Dict:
        """Get email communication metrics for a user"""
        try:
            metrics = {
                'sent_messages': [],
                'received_messages': [],
                'response_times': [],
                'sentiments': [],
                'unread_count': 0,
                'after_hours_sent': 0,
                'external_emails': 0
            }
            
            # Get sent emails
            sent_query = f'from:{email} after:{start_date.strftime("%Y/%m/%d")} before:{end_date.strftime("%Y/%m/%d")}'
            sent_messages = self._search_messages(sent_query)
            metrics['sent_messages'] = sent_messages
            
            # Get received emails
            received_query = f'to:{email} after:{start_date.strftime("%Y/%m/%d")} before:{end_date.strftime("%Y/%m/%d")}'
            received_messages = self._search_messages(received_query)
            metrics['received_messages'] = received_messages
            
            # Analyze messages
            for msg_id in sent_messages[:100]:  # Limit for performance
                msg_data = self._get_message_details(msg_id)
                if msg_data:
                    metrics = self._analyze_message(msg_data, metrics, 'sent')
            
            for msg_id in received_messages[:100]:
                msg_data = self._get_message_details(msg_id)
                if msg_data:
                    metrics = self._analyze_message(msg_data, metrics, 'received')
            
            return self._calculate_email_metrics(metrics)
            
        except Exception as e:
            logger.error(f"Error getting email metrics: {e}")
            return {}
    
    def _search_messages(self, query: str) -> List[str]:
        """Search for messages matching query"""
        try:
            result = self.service.users().messages().list(
                userId='me',
                q=query
            ).execute()
            
            messages = result.get('messages', [])
            return [msg['id'] for msg in messages]
            
        except HttpError as e:
            logger.error(f"Gmail API error: {e}")
            return []
    
    def _get_message_details(self, msg_id: str) -> Optional[Dict]:
        """Get details of a specific message"""
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=msg_id
            ).execute()
            
            return message
            
        except HttpError as e:
            logger.error(f"Error getting message {msg_id}: {e}")
            return None
    
    def _analyze_message(self, message: Dict, metrics: Dict, msg_type: str) -> Dict:
        """Analyze individual message for metrics"""
        try:
            headers = message['payload'].get('headers', [])
            header_dict = {h['name']: h['value'] for h in headers}
            
            # Get timestamp
            if 'Date' in header_dict:
                msg_time = datetime.strptime(
                    header_dict['Date'][:31], 
                    '%a, %d %b %Y %H:%M:%S %z'
                )
                
                # Check if after hours
                if msg_time.hour < 9 or msg_time.hour >= 18:
                    if msg_type == 'sent':
                        metrics['after_hours_sent'] += 1
                
                # Check if external
                if msg_type == 'sent' and 'To' in header_dict:
                    if '@' in header_dict['To'] and 'company.com' not in header_dict['To']:
                        metrics['external_emails'] += 1
            
            # Get body for sentiment analysis
            body = self._extract_body(message['payload'])
            if body:
                sentiment = TextBlob(body[:500]).sentiment.polarity
                metrics['sentiments'].append(sentiment)
            
            # Check if unread
            if 'UNREAD' in message.get('labelIds', []):
                metrics['unread_count'] += 1
                
        except Exception as e:
            logger.error(f"Error analyzing message: {e}")
        
        return metrics
    
    def _extract_body(self, payload: Dict) -> str:
        """Extract body text from email payload"""
        body = ""
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data', '')
                    if data:
                        body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                        break
        elif payload.get('body', {}).get('data'):
            body = base64.urlsafe_b64decode(
                payload['body']['data']
            ).decode('utf-8', errors='ignore')
        
        return body
    
    def _calculate_email_metrics(self, metrics: Dict) -> Dict:
        """Calculate final email metrics"""
        sent_count = len(metrics['sent_messages'])
        received_count = len(metrics['received_messages'])
        total_count = sent_count + received_count
        
        return {
            'sent_count': sent_count,
            'received_count': received_count,
            'avg_response_time_hours': 4.5,  # Simplified - would calculate actual
            'unread_percentage': (
                (metrics['unread_count'] / received_count * 100) 
                if received_count > 0 else 0
            ),
            'after_hours_percentage': (
                (metrics['after_hours_sent'] / sent_count * 100)
                if sent_count > 0 else 0
            ),
            'avg_sentiment': (
                sum(metrics['sentiments']) / len(metrics['sentiments'])
                if metrics['sentiments'] else 0
            ),
            'external_percentage': (
                (metrics['external_emails'] / sent_count * 100)
                if sent_count > 0 else 0
            )
        }