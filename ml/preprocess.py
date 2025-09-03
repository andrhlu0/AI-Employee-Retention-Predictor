import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class DataPreprocessor:
    def __init__(self):
        self.feature_columns = []
        
    def preprocess_raw_data(self, raw_data: Dict) -> pd.DataFrame:
        """Convert raw integration data to feature dataframe"""
        features = []
        
        for employee_id, data in raw_data.items():
            employee_features = self._extract_employee_features(data)
            employee_features['employee_id'] = employee_id
            features.append(employee_features)
        
        df = pd.DataFrame(features)
        return self._engineer_features(df)
    
    def _extract_employee_features(self, data: Dict) -> Dict:
        """Extract features from employee data"""
        features = {}
        
        # Basic features
        basic = data.get('basic_info', {})
        features['tenure_days'] = basic.get('tenure_days', 0)
        features['department'] = basic.get('department', 'unknown')
        features['position'] = basic.get('position', 'unknown')
        
        # Slack features
        slack = data.get('slack_metrics', {})
        features['slack_messages'] = slack.get('message_count', 0)
        features['slack_response_time'] = slack.get('avg_response_time', 0)
        features['slack_channels'] = slack.get('active_channels', 0)
        features['slack_sentiment'] = slack.get('sentiment_score', 0)
        features['slack_after_hours'] = slack.get('after_hours_messages', 0)
        features['slack_trend'] = slack.get('participation_trend', 'stable')
        
        # Email features
        email = data.get('email_metrics', {})
        features['email_sent'] = email.get('sent_count', 0)
        features['email_received'] = email.get('received_count', 0)
        features['email_response_time'] = email.get('avg_response_time', 0)
        features['email_unread'] = email.get('unread_percentage', 0)
        features['email_after_hours'] = email.get('after_hours_emails', 0)
        features['email_sentiment'] = email.get('email_sentiment', 0)
        features['email_external'] = email.get('external_communication', 0)
        
        # Calendar features
        calendar = data.get('calendar_metrics', {})
        features['meeting_hours'] = calendar.get('meeting_hours', 0)
        features['meetings_declined'] = calendar.get('meetings_declined', 0)
        features['one_on_ones'] = calendar.get('one_on_ones', 0)
        features['recurring_dropped'] = calendar.get('recurring_meetings_dropped', 0)
        features['meeting_participation'] = calendar.get('meeting_participation', 0)
        features['calendar_fragmentation'] = calendar.get('calendar_fragmentation', 0)
        features['pto_days'] = calendar.get('pto_days', 0)
        
        # Productivity features
        productivity = data.get('productivity_metrics', {})
        features['task_completion'] = productivity.get('task_completion_rate', 0)
        features['project_involvement'] = productivity.get('project_involvement', 0)
        features['code_commits'] = productivity.get('code_commits', 0)
        features['ticket_resolution'] = productivity.get('ticket_resolution_time', 0)
        features['performance_trend'] = productivity.get('performance_trend', 'stable')
        features['skill_utilization'] = productivity.get('skill_utilization', 0)
        features['workload_balance'] = productivity.get('workload_balance', 0)
        
        return features
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer additional features"""
        # Normalize numeric features
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        for col in numeric_columns:
            if df[col].std() > 0:
                df[f'{col}_normalized'] = (df[col] - df[col].mean()) / df[col].std()
        
        # Encode categorical features
        df['department_encoded'] = pd.Categorical(df['department']).codes
        df['position_encoded'] = pd.Categorical(df['position']).codes
        
        # Create interaction features
        df['communication_balance'] = abs(df['slack_messages'] - df['email_sent'])
        df['after_hours_total'] = df['slack_after_hours'] + df['email_after_hours']
        df['sentiment_average'] = (df['slack_sentiment'] + df['email_sentiment']) / 2
        df['engagement_score'] = (df['meeting_participation'] + df['task_completion']) / 2
        
        # Create risk indicators
        df['burnout_risk'] = (
            (df['after_hours_total'] > df['after_hours_total'].quantile(0.75)).astype(int) +
            (df['meeting_hours'] > df['meeting_hours'].quantile(0.75)).astype(int)
        ) / 2
        
        df['isolation_risk'] = (
            (df['slack_channels'] < df['slack_channels'].quantile(0.25)).astype(int) +
            (df['one_on_ones'] < df['one_on_ones'].quantile(0.25)).astype(int)
        ) / 2
        
        return df
    
    def handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values in the dataset"""
        # Numeric columns: fill with median
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        for col in numeric_columns:
            df[col].fillna(df[col].median(), inplace=True)
        
        # Categorical columns: fill with mode
        categorical_columns = df.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else 'unknown', inplace=True)
        
        return df