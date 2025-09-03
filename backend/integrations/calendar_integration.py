import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError

from config import settings

logger = logging.getLogger(__name__)

class CalendarIntegration:
    def __init__(self):
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Google Calendar API service"""
        try:
            creds = Credentials(
                token='access_token',
                refresh_token='refresh_token',
                token_uri='https://oauth2.googleapis.com/token',
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET
            )
            self.service = build('calendar', 'v3', credentials=creds)
        except Exception as e:
            logger.error(f"Error initializing Calendar service: {e}")
    
    def get_calendar_metrics(self, calendar_id: str, start_date: datetime, 
                            end_date: datetime) -> Dict:
        """Get calendar and meeting metrics"""
        try:
            metrics = {
                'total_meetings': 0,
                'total_hours': 0,
                'declined_meetings': 0,
                'accepted_meetings': 0,
                'one_on_ones': 0,
                'recurring_meetings': 0,
                'pto_days': 0,
                'focus_time_hours': 0,
                'meeting_types': {}
            }
            
            # Get all events in date range
            events = self._get_events(calendar_id, start_date, end_date)
            
            for event in events:
                metrics = self._analyze_event(event, metrics)
            
            return self._calculate_calendar_metrics(metrics, start_date, end_date)
            
        except Exception as e:
            logger.error(f"Error getting calendar metrics: {e}")
            return {}
    
    def _get_events(self, calendar_id: str, start_date: datetime, 
                   end_date: datetime) -> List[Dict]:
        """Get calendar events in date range"""
        try:
            events_result = self.service.events().list(
                calendarId=calendar_id,
                timeMin=start_date.isoformat() + 'Z',
                timeMax=end_date.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
            
        except HttpError as e:
            logger.error(f"Calendar API error: {e}")
            return []
    
    def _analyze_event(self, event: Dict, metrics: Dict) -> Dict:
        """Analyze individual calendar event"""
        try:
            # Check if declined
            for attendee in event.get('attendees', []):
                if attendee.get('self'):
                    if attendee.get('responseStatus') == 'declined':
                        metrics['declined_meetings'] += 1
                    elif attendee.get('responseStatus') == 'accepted':
                        metrics['accepted_meetings'] += 1
                    break
            
            # Calculate duration
            if 'start' in event and 'end' in event:
                start = self._parse_datetime(event['start'])
                end = self._parse_datetime(event['end'])
                if start and end:
                    duration_hours = (end - start).total_seconds() / 3600
                    metrics['total_hours'] += duration_hours
                    metrics['total_meetings'] += 1
            
            # Check if one-on-one
            attendees = event.get('attendees', [])
            if len(attendees) == 2:
                metrics['one_on_ones'] += 1
            
            # Check if recurring
            if event.get('recurringEventId'):
                metrics['recurring_meetings'] += 1
            
            # Check for PTO
            summary = event.get('summary', '').lower()
            if any(term in summary for term in ['pto', 'vacation', 'out of office', 'ooo']):
                metrics['pto_days'] += duration_hours / 8  # Convert to days
            
        except Exception as e:
            logger.error(f"Error analyzing event: {e}")
        
        return metrics
    
    def _parse_datetime(self, dt_dict: Dict) -> Optional[datetime]:
        """Parse datetime from calendar event"""
        try:
            if 'dateTime' in dt_dict:
                return datetime.fromisoformat(dt_dict['dateTime'].replace('Z', '+00:00'))
            elif 'date' in dt_dict:
                return datetime.strptime(dt_dict['date'], '%Y-%m-%d')
        except:
            return None
    
    def _calculate_calendar_metrics(self, metrics: Dict, start_date: datetime, 
                                   end_date: datetime) -> Dict:
        """Calculate final calendar metrics"""
        total_days = (end_date - start_date).days
        work_hours = total_days * 8  # Assuming 8-hour work days
        
        return {
            'total_meeting_hours': metrics['total_hours'],
            'declined_percentage': (
                (metrics['declined_meetings'] / 
                 (metrics['declined_meetings'] + metrics['accepted_meetings']) * 100)
                if (metrics['declined_meetings'] + metrics['accepted_meetings']) > 0 else 0
            ),
            'one_on_one_count': metrics['one_on_ones'],
            'dropped_recurring': 0,  # Would need historical data to calculate
            'participation_score': min(metrics['accepted_meetings'] / 
                                      max(metrics['total_meetings'], 1), 1.0),
            'fragmentation_score': min(metrics['total_hours'] / work_hours, 1.0),
            'pto_days': metrics['pto_days']
        }