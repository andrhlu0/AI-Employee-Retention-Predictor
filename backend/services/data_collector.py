import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pandas as pd
from sqlalchemy.orm import Session

from integrations.slack_integration import SlackIntegration
from integrations.email_integration import EmailIntegration
from integrations.calendar_integration import CalendarIntegration
from integrations.productivity_integration import ProductivityIntegration
from models.employee import Employee

logger = logging.getLogger(__name__)

class DataCollector:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.slack = SlackIntegration()
        self.email = EmailIntegration()
        self.calendar = CalendarIntegration()
        self.productivity = ProductivityIntegration()
        
    def collect_all_data(self, employee_id: Optional[str] = None) -> Dict:
        """Collect data from all sources for analysis"""
        try:
            if employee_id:
                employees = [self.db.query(Employee).filter_by(employee_id=employee_id).first()]
            else:
                employees = self.db.query(Employee).filter_by(is_active=True).all()
            
            all_data = {}
            for employee in employees:
                employee_data = self.collect_employee_data(employee)
                all_data[employee.employee_id] = employee_data
                
            return all_data
        except Exception as e:
            logger.error(f"Error collecting data: {e}")
            raise
    
    def collect_employee_data(self, employee: Employee) -> Dict:
        """Collect all data for a single employee"""
        data = {
            'employee_id': employee.employee_id,
            'basic_info': {
                'department': employee.department,
                'position': employee.position,
                'tenure_days': (datetime.now() - employee.hire_date).days if employee.hire_date else 0
            }
        }
        
        # Collect from each integration
        if employee.slack_user_id:
            data['slack_metrics'] = self.collect_slack_data(employee.slack_user_id)
        
        if employee.email:
            data['email_metrics'] = self.collect_email_data(employee.email)
        
        if employee.calendar_id:
            data['calendar_metrics'] = self.collect_calendar_data(employee.calendar_id)
        
        data['productivity_metrics'] = self.collect_productivity_data(employee.employee_id)
        
        return data
    
    def collect_slack_data(self, slack_user_id: str) -> Dict:
        """Collect Slack communication metrics"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            metrics = self.slack.get_user_metrics(
                slack_user_id, 
                start_date, 
                end_date
            )
            
            return {
                'message_count': metrics.get('total_messages', 0),
                'avg_response_time': metrics.get('avg_response_time_minutes', 0),
                'active_channels': metrics.get('active_channels', 0),
                'mentions_received': metrics.get('mentions_received', 0),
                'sentiment_score': metrics.get('avg_sentiment', 0),
                'after_hours_messages': metrics.get('after_hours_percentage', 0),
                'participation_trend': metrics.get('participation_trend', 'stable')
            }
        except Exception as e:
            logger.error(f"Error collecting Slack data: {e}")
            return {}
    
    def collect_email_data(self, email: str) -> Dict:
        """Collect email communication metrics"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            metrics = self.email.get_email_metrics(email, start_date, end_date)
            
            return {
                'sent_count': metrics.get('sent_count', 0),
                'received_count': metrics.get('received_count', 0),
                'avg_response_time': metrics.get('avg_response_time_hours', 0),
                'unread_percentage': metrics.get('unread_percentage', 0),
                'after_hours_emails': metrics.get('after_hours_percentage', 0),
                'email_sentiment': metrics.get('avg_sentiment', 0),
                'external_communication': metrics.get('external_percentage', 0)
            }
        except Exception as e:
            logger.error(f"Error collecting email data: {e}")
            return {}
    
    def collect_calendar_data(self, calendar_id: str) -> Dict:
        """Collect calendar and meeting metrics"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            metrics = self.calendar.get_calendar_metrics(
                calendar_id, 
                start_date, 
                end_date
            )
            
            return {
                'meeting_hours': metrics.get('total_meeting_hours', 0),
                'meetings_declined': metrics.get('declined_percentage', 0),
                'one_on_ones': metrics.get('one_on_one_count', 0),
                'recurring_meetings_dropped': metrics.get('dropped_recurring', 0),
                'meeting_participation': metrics.get('participation_score', 0),
                'calendar_fragmentation': metrics.get('fragmentation_score', 0),
                'pto_days': metrics.get('pto_days', 0)
            }
        except Exception as e:
            logger.error(f"Error collecting calendar data: {e}")
            return {}
    
    def collect_productivity_data(self, employee_id: str) -> Dict:
        """Collect productivity and performance metrics"""
        try:
            metrics = self.productivity.get_productivity_metrics(employee_id)
            
            return {
                'task_completion_rate': metrics.get('completion_rate', 0),
                'project_involvement': metrics.get('active_projects', 0),
                'code_commits': metrics.get('code_commits_30d', 0),
                'ticket_resolution_time': metrics.get('avg_resolution_hours', 0),
                'performance_trend': metrics.get('performance_trend', 'stable'),
                'skill_utilization': metrics.get('skill_utilization_score', 0),
                'workload_balance': metrics.get('workload_score', 0)
            }
        except Exception as e:
            logger.error(f"Error collecting productivity data: {e}")
            return {}