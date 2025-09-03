import numpy as np
import pandas as pd
from typing import Dict, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class FeatureExtractor:
    def __init__(self):
        self.feature_columns = []
        
    def extract_features(self, employee_data: Dict) -> np.ndarray:
        """Extract ML features from raw employee data"""
        features = []
        
        # Basic features
        basic = employee_data.get('basic_info', {})
        features.extend([
            basic.get('tenure_days', 0) / 365,  # Normalize to years
            self._encode_department(basic.get('department', '')),
            self._encode_position_level(basic.get('position', ''))
        ])
        
        # Slack features
        slack = employee_data.get('slack_metrics', {})
        features.extend([
            slack.get('message_count', 0) / 100,  # Normalize
            slack.get('avg_response_time', 0) / 60,  # To hours
            slack.get('active_channels', 0) / 10,
            slack.get('sentiment_score', 0),
            slack.get('after_hours_messages', 0) / 100,
            self._encode_trend(slack.get('participation_trend', 'stable'))
        ])
        
        # Email features
        email = employee_data.get('email_metrics', {})
        features.extend([
            email.get('sent_count', 0) / 100,
            email.get('received_count', 0) / 100,
            email.get('avg_response_time', 0) / 24,  # To days
            email.get('unread_percentage', 0) / 100,
            email.get('after_hours_emails', 0) / 100,
            email.get('email_sentiment', 0),
            email.get('external_communication', 0) / 100
        ])
        
        # Calendar features
        calendar = employee_data.get('calendar_metrics', {})
        features.extend([
            calendar.get('meeting_hours', 0) / 40,  # Normalize to work week
            calendar.get('meetings_declined', 0) / 100,
            calendar.get('one_on_ones', 0) / 10,
            calendar.get('recurring_meetings_dropped', 0),
            calendar.get('meeting_participation', 0),
            calendar.get('calendar_fragmentation', 0),
            calendar.get('pto_days', 0) / 20  # Normalize to typical annual PTO
        ])
        
        # Productivity features
        productivity = employee_data.get('productivity_metrics', {})
        features.extend([
            productivity.get('task_completion_rate', 0),
            productivity.get('project_involvement', 0) / 5,
            productivity.get('code_commits', 0) / 50,
            productivity.get('ticket_resolution_time', 0) / 48,  # To days
            self._encode_trend(productivity.get('performance_trend', 'stable')),
            productivity.get('skill_utilization', 0),
            productivity.get('workload_balance', 0)
        ])
        
        # Derived features
        features.extend(self._calculate_derived_features(employee_data))
        
        return np.array(features)
    
    def _calculate_derived_features(self, data: Dict) -> List[float]:
        """Calculate complex derived features"""
        derived = []
        
        # Communication balance score
        slack_activity = data.get('slack_metrics', {}).get('message_count', 0)
        email_activity = data.get('email_metrics', {}).get('sent_count', 0)
        comm_balance = abs(slack_activity - email_activity) / max(slack_activity + email_activity, 1)
        derived.append(comm_balance)
        
        # Engagement score
        meeting_participation = data.get('calendar_metrics', {}).get('meeting_participation', 0)
        slack_sentiment = data.get('slack_metrics', {}).get('sentiment_score', 0)
        engagement = (meeting_participation + slack_sentiment) / 2
        derived.append(engagement)
        
        # Burnout risk score
        after_hours_slack = data.get('slack_metrics', {}).get('after_hours_messages', 0)
        after_hours_email = data.get('email_metrics', {}).get('after_hours_emails', 0)
        meeting_hours = data.get('calendar_metrics', {}).get('meeting_hours', 0)
        burnout_risk = (after_hours_slack + after_hours_email) / 200 + min(meeting_hours / 40, 1)
        derived.append(burnout_risk)
        
        # Isolation score
        active_channels = data.get('slack_metrics', {}).get('active_channels', 0)
        one_on_ones = data.get('calendar_metrics', {}).get('one_on_ones', 0)
        isolation = 1 - (min(active_channels / 10, 1) + min(one_on_ones / 5, 1)) / 2
        derived.append(isolation)
        
        return derived
    
    def _encode_department(self, department: str) -> float:
        """Encode department as numeric feature"""
        dept_map = {
            'engineering': 0.1,
            'product': 0.2,
            'sales': 0.3,
            'marketing': 0.4,
            'hr': 0.5,
            'finance': 0.6,
            'operations': 0.7,
            'support': 0.8
        }
        return dept_map.get(department.lower(), 0.5)
    
    def _encode_position_level(self, position: str) -> float:
        """Encode position level as numeric feature"""
        if 'senior' in position.lower() or 'lead' in position.lower():
            return 0.8
        elif 'manager' in position.lower() or 'director' in position.lower():
            return 0.9
        elif 'junior' in position.lower() or 'entry' in position.lower():
            return 0.3
        else:
            return 0.5
    
    def _encode_trend(self, trend: str) -> float:
        """Encode trend as numeric feature"""
        trend_map = {
            'declining': -1.0,
            'stable': 0.0,
            'improving': 1.0
        }
        return trend_map.get(trend.lower(), 0.0)
    
    def get_feature_importance(self, model) -> Dict[str, float]:
        """Get feature importance from trained model"""
        feature_names = [
            'tenure_years', 'department', 'position_level',
            'slack_messages', 'slack_response_time', 'slack_channels',
            'slack_sentiment', 'slack_after_hours', 'slack_trend',
            'email_sent', 'email_received', 'email_response_time',
            'email_unread', 'email_after_hours', 'email_sentiment',
            'email_external', 'meeting_hours', 'meetings_declined',
            'one_on_ones', 'recurring_dropped', 'meeting_participation',
            'calendar_fragmentation', 'pto_days', 'task_completion',
            'project_involvement', 'code_commits', 'ticket_resolution',
            'performance_trend', 'skill_utilization', 'workload_balance',
            'comm_balance', 'engagement', 'burnout_risk', 'isolation'
        ]
        
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            return dict(zip(feature_names, importances))
        return {}