# backend/integrations/slack_integration.py
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from textblob import TextBlob
import re
import statistics
from collections import defaultdict

from config import settings

logger = logging.getLogger(__name__)

class SlackIntegration:
    def __init__(self, bot_token: Optional[str] = None):
        self.client = WebClient(token=bot_token or settings.SLACK_BOT_TOKEN)
        self.user_cache = {}
        self.channel_cache = {}
    
    def test_connection(self) -> bool:
        """Test if Slack connection is working"""
        try:
            response = self.client.auth_test()
            return response["ok"]
        except Exception as e:
            logger.error(f"Slack connection test failed: {e}")
            return False
    
    def get_user_metrics(self, user_id: str, start_date: datetime, end_date: datetime) -> Dict:
        """Get comprehensive Slack metrics for a user"""
        try:
            metrics = {
                'total_messages': 0,
                'channels_active': set(),
                'response_times': [],
                'sentiments': [],
                'after_hours_count': 0,
                'mentions_received': 0,
                'threads_started': 0,
                'reactions_given': 0,
                'reactions_received': 0,
                'direct_messages': 0,
                'channel_messages': 0,
                'message_lengths': [],
                'keywords': defaultdict(int)
            }
            
            # Get user info
            user_info = self._get_user_info(user_id)
            if not user_info:
                return {}
            
            # Get user's channels
            channels = self._get_user_channels(user_id)
            
            # Analyze each channel
            for channel in channels:
                try:
                    channel_metrics = self._analyze_channel_activity(
                        channel['id'], user_id, start_date, end_date
                    )
                    metrics = self._merge_metrics(metrics, channel_metrics)
                except Exception as e:
                    logger.warning(f"Error analyzing channel {channel['id']}: {e}")
                    continue
            
            # Get direct messages
            dm_metrics = self._analyze_direct_messages(user_id, start_date, end_date)
            metrics = self._merge_metrics(metrics, dm_metrics)
            
            # Calculate final aggregated metrics
            return self._calculate_final_metrics(metrics, user_info)
            
        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            return {}
        except Exception as e:
            logger.error(f"Error getting Slack metrics: {e}")
            return {}
    
    def _get_user_info(self, user_id: str) -> Optional[Dict]:
        """Get user information from Slack"""
        if user_id in self.user_cache:
            return self.user_cache[user_id]
        
        try:
            response = self.client.users_info(user=user_id)
            if response["ok"]:
                self.user_cache[user_id] = response["user"]
                return response["user"]
        except Exception as e:
            logger.error(f"Error getting user info: {e}")
        return None
    
    def _get_user_channels(self, user_id: str) -> List[Dict]:
        """Get all channels a user is member of"""
        channels = []
        try:
            # Get public channels
            response = self.client.users_conversations(
                user=user_id,
                types="public_channel,private_channel",
                limit=200
            )
            
            if response["ok"]:
                channels.extend(response["channels"])
                
                # Handle pagination
                while response.get("response_metadata", {}).get("next_cursor"):
                    response = self.client.users_conversations(
                        user=user_id,
                        types="public_channel,private_channel",
                        cursor=response["response_metadata"]["next_cursor"],
                        limit=200
                    )
                    channels.extend(response["channels"])
                    
        except Exception as e:
            logger.error(f"Error getting user channels: {e}")
        
        return channels
    
    def _analyze_channel_activity(self, channel_id: str, user_id: str, 
                                 start_date: datetime, end_date: datetime) -> Dict:
        """Analyze user's activity in a specific channel"""
        metrics = {
            'total_messages': 0,
            'channels_active': {channel_id},
            'response_times': [],
            'sentiments': [],
            'after_hours_count': 0,
            'mentions_received': 0,
            'threads_started': 0,
            'reactions_given': 0,
            'reactions_received': 0,
            'message_lengths': [],
            'keywords': defaultdict(int)
        }
        
        try:
            # Convert dates to timestamps
            start_ts = start_date.timestamp()
            end_ts = end_date.timestamp()
            
            # Get channel history
            response = self.client.conversations_history(
                channel=channel_id,
                oldest=str(start_ts),
                latest=str(end_ts),
                limit=1000
            )
            
            if not response["ok"]:
                return metrics
            
            messages = response["messages"]
            
            # Handle pagination
            while response.get("has_more"):
                response = self.client.conversations_history(
                    channel=channel_id,
                    oldest=str(start_ts),
                    latest=str(end_ts),
                    cursor=response["response_metadata"]["next_cursor"],
                    limit=1000
                )
                messages.extend(response["messages"])
            
            # Analyze messages
            user_messages = []
            all_messages_by_time = {}
            
            for message in messages:
                msg_time = datetime.fromtimestamp(float(message["ts"]))
                all_messages_by_time[message["ts"]] = message
                
                # Check if message is from the user
                if message.get("user") == user_id:
                    user_messages.append(message)
                    metrics['total_messages'] += 1
                    
                    # Analyze message content
                    text = message.get("text", "")
                    metrics['message_lengths'].append(len(text))
                    
                    # Sentiment analysis
                    if text:
                        sentiment = self._analyze_sentiment(text)
                        metrics['sentiments'].append(sentiment)
                    
                    # Extract keywords
                    keywords = self._extract_keywords(text)
                    for keyword in keywords:
                        metrics['keywords'][keyword] += 1
                    
                    # Check if after hours (before 9am or after 6pm)
                    if msg_time.hour < 9 or msg_time.hour >= 18:
                        metrics['after_hours_count'] += 1
                    
                    # Check if starting a thread
                    if "thread_ts" not in message or message["thread_ts"] == message["ts"]:
                        metrics['threads_started'] += 1
                    
                    # Calculate response time if replying
                    if "thread_ts" in message and message["thread_ts"] != message["ts"]:
                        parent_ts = message["thread_ts"]
                        if parent_ts in all_messages_by_time:
                            parent_msg = all_messages_by_time[parent_ts]
                            if parent_msg.get("user") != user_id:
                                response_time = float(message["ts"]) - float(parent_ts)
                                metrics['response_times'].append(response_time / 60)  # Convert to minutes
                
                # Check for mentions
                if f"<@{user_id}>" in message.get("text", ""):
                    metrics['mentions_received'] += 1
                
                # Count reactions
                if "reactions" in message:
                    for reaction in message["reactions"]:
                        if message.get("user") == user_id:
                            metrics['reactions_received'] += len(reaction["users"])
                        if user_id in reaction["users"]:
                            metrics['reactions_given'] += 1
            
        except Exception as e:
            logger.warning(f"Error analyzing channel {channel_id}: {e}")
        
        return metrics
    
    def _analyze_direct_messages(self, user_id: str, start_date: datetime, 
                                end_date: datetime) -> Dict:
        """Analyze user's direct message activity"""
        metrics = {
            'direct_messages': 0,
            'response_times': [],
            'sentiments': [],
            'after_hours_count': 0
        }
        
        try:
            # Get DM conversations
            response = self.client.users_conversations(
                user=user_id,
                types="im",
                limit=200
            )
            
            if response["ok"]:
                for dm in response["channels"]:
                    dm_metrics = self._analyze_channel_activity(
                        dm["id"], user_id, start_date, end_date
                    )
                    metrics['direct_messages'] += dm_metrics['total_messages']
                    metrics['response_times'].extend(dm_metrics['response_times'])
                    metrics['sentiments'].extend(dm_metrics['sentiments'])
                    metrics['after_hours_count'] += dm_metrics['after_hours_count']
        
        except Exception as e:
            logger.error(f"Error analyzing DMs: {e}")
        
        return metrics
    
    def _analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment of text using TextBlob"""
        try:
            # Remove Slack-specific formatting
            text = re.sub(r'<@\w+>', '', text)  # Remove user mentions
            text = re.sub(r'<#\w+\|?\w*>', '', text)  # Remove channel mentions
            text = re.sub(r':\w+:', '', text)  # Remove emoji codes
            text = re.sub(r'<http[s]?://[^\s]+>', '', text)  # Remove URLs
            
            if not text.strip():
                return 0.0
            
            blob = TextBlob(text)
            return blob.sentiment.polarity  # Returns -1 to 1
        except Exception as e:
            logger.debug(f"Sentiment analysis error: {e}")
            return 0.0
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from text"""
        # Keywords that might indicate retention risk
        risk_keywords = [
            'quit', 'resign', 'leave', 'leaving', 'frustrated', 'unhappy',
            'disappointed', 'stress', 'stressed', 'overwhelmed', 'burnout',
            'tired', 'exhausted', 'unfair', 'undervalued', 'underpaid',
            'interview', 'opportunity', 'offer', 'considering'
        ]
        
        text_lower = text.lower()
        found_keywords = []
        
        for keyword in risk_keywords:
            if keyword in text_lower:
                found_keywords.append(keyword)
        
        return found_keywords
    
    def _merge_metrics(self, metrics1: Dict, metrics2: Dict) -> Dict:
        """Merge two metrics dictionaries"""
        merged = metrics1.copy()
        
        for key, value in metrics2.items():
            if key in merged:
                if isinstance(value, (int, float)):
                    merged[key] += value
                elif isinstance(value, list):
                    merged[key].extend(value)
                elif isinstance(value, set):
                    merged[key] = merged[key].union(value)
                elif isinstance(value, dict):
                    for k, v in value.items():
                        if k in merged[key]:
                            merged[key][k] += v
                        else:
                            merged[key][k] = v
            else:
                merged[key] = value
        
        return merged
    
    def _calculate_final_metrics(self, raw_metrics: Dict, user_info: Dict) -> Dict:
        """Calculate final aggregated metrics"""
        final_metrics = {
            'total_messages': raw_metrics['total_messages'],
            'channel_messages': raw_metrics['total_messages'] - raw_metrics.get('direct_messages', 0),
            'direct_messages': raw_metrics.get('direct_messages', 0),
            'active_channels': len(raw_metrics['channels_active']),
            'mentions_received': raw_metrics['mentions_received'],
            'threads_started': raw_metrics['threads_started'],
            'reactions_given': raw_metrics['reactions_given'],
            'reactions_received': raw_metrics['reactions_received'],
            'after_hours_percentage': 0,
            'avg_response_time_minutes': 0,
            'avg_sentiment': 0,
            'avg_message_length': 0,
            'participation_score': 0,
            'risk_keywords_found': list(raw_metrics['keywords'].keys()),
            'user_timezone': user_info.get('tz', 'UTC'),
            'user_title': user_info.get('profile', {}).get('title', ''),
            'user_status': user_info.get('profile', {}).get('status_text', '')
        }
        
        # Calculate percentages and averages
        if raw_metrics['total_messages'] > 0:
            final_metrics['after_hours_percentage'] = (
                raw_metrics['after_hours_count'] / raw_metrics['total_messages'] * 100
            )
        
        if raw_metrics['response_times']:
            final_metrics['avg_response_time_minutes'] = statistics.mean(raw_metrics['response_times'])
        
        if raw_metrics['sentiments']:
            final_metrics['avg_sentiment'] = statistics.mean(raw_metrics['sentiments'])
        
        if raw_metrics['message_lengths']:
            final_metrics['avg_message_length'] = statistics.mean(raw_metrics['message_lengths'])
        
        # Calculate participation score (0-1)
        participation_factors = [
            min(raw_metrics['total_messages'] / 500, 1),  # Message volume
            min(len(raw_metrics['channels_active']) / 10, 1),  # Channel participation
            min(raw_metrics['threads_started'] / 20, 1),  # Thread engagement
            min(raw_metrics['reactions_given'] / 50, 1),  # Reaction engagement
            1 - min(raw_metrics.get('after_hours_count', 0) / 100, 1)  # Work-life balance
        ]
        final_metrics['participation_score'] = statistics.mean(participation_factors)
        
        # Determine participation trend
        if raw_metrics['total_messages'] < 10:
            final_metrics['participation_trend'] = 'inactive'
        elif raw_metrics['total_messages'] < 50:
            final_metrics['participation_trend'] = 'low'
        elif raw_metrics['total_messages'] < 200:
            final_metrics['participation_trend'] = 'moderate'
        else:
            final_metrics['participation_trend'] = 'high'
        
        return final_metrics
    
    async def sync_employee_data(self, company_id: int, employee_ids: Optional[List[str]] = None) -> List[Dict]:
        """Sync Slack data for employees"""
        from models import Employee
        from database import SessionLocal
        
        db = SessionLocal()
        results = []
        
        try:
            # Get employees to sync
            query = db.query(Employee).filter(Employee.company_id == company_id)
            if employee_ids:
                query = query.filter(Employee.employee_id.in_(employee_ids))
            employees = query.all()
            
            # Get Slack users
            slack_users = self._get_all_users()
            email_to_slack_id = {
                user.get('profile', {}).get('email'): user['id']
                for user in slack_users
                if user.get('profile', {}).get('email')
            }
            
            for employee in employees:
                try:
                    # Match employee to Slack user by email
                    slack_user_id = email_to_slack_id.get(employee.email)
                    
                    if slack_user_id:
                        # Store Slack user ID
                        employee.slack_user_id = slack_user_id
                        
                        # Get metrics for last 30 days
                        end_date = datetime.now()
                        start_date = end_date - timedelta(days=30)
                        
                        metrics = self.get_user_metrics(slack_user_id, start_date, end_date)
                        
                        # Store metrics
                        employee.integration_data = employee.integration_data or {}
                        employee.integration_data['slack'] = {
                            'metrics': metrics,
                            'synced_at': datetime.now().isoformat()
                        }
                        
                        results.append({
                            'employee_id': employee.employee_id,
                            'slack_user_id': slack_user_id,
                            'status': 'success'
                        })
                    else:
                        results.append({
                            'employee_id': employee.employee_id,
                            'status': 'not_found',
                            'message': 'No matching Slack user found'
                        })
                
                except Exception as e:
                    results.append({
                        'employee_id': employee.employee_id,
                        'status': 'error',
                        'error': str(e)
                    })
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error syncing Slack data: {e}")
            db.rollback()
        finally:
            db.close()
        
        return results
    
    def _get_all_users(self) -> List[Dict]:
        """Get all users in the Slack workspace"""
        users = []
        try:
            response = self.client.users_list(limit=200)
            
            if response["ok"]:
                users.extend(response["members"])
                
                # Handle pagination
                while response.get("response_metadata", {}).get("next_cursor"):
                    response = self.client.users_list(
                        cursor=response["response_metadata"]["next_cursor"],
                        limit=200
                    )
                    users.extend(response["members"])
            
            # Filter out bots and deleted users
            users = [
                user for user in users
                if not user.get("is_bot") and not user.get("deleted")
            ]
            
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
        
        return users
    
    def send_alert(self, channel: str, message: str, blocks: Optional[List[Dict]] = None):
        """Send an alert message to a Slack channel"""
        try:
            response = self.client.chat_postMessage(
                channel=channel,
                text=message,
                blocks=blocks
            )
            return response["ok"]
        except Exception as e:
            logger.error(f"Error sending Slack alert: {e}")
            return False
    
    def create_retention_alert_blocks(self, employee_name: str, risk_score: float, 
                                    risk_factors: Dict) -> List[Dict]:
        """Create formatted blocks for retention risk alerts"""
        risk_level = "🔴 Critical" if risk_score >= 0.75 else "🟡 High" if risk_score >= 0.5 else "🟢 Medium"
        
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "⚠️ Retention Risk Alert",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Employee:*\n{employee_name}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Risk Level:*\n{risk_level}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Risk Score:*\n{risk_score:.1%}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Predicted Departure:*\n{self._get_departure_window(risk_score)}"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Key Risk Factors:*"
                }
            }
        ]
        
        # Add risk factors
        factor_text = ""
        for factor, severity in risk_factors.items():
            emoji = "🔴" if severity == "high" else "🟡" if severity == "medium" else "🟢"
            factor_text += f"{emoji} {factor.replace('_', ' ').title()}\n"
        
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": factor_text
            }
        })
        
        # Add action buttons
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View Details",
                        "emoji": True
                    },
                    "value": f"view_employee_{employee_name}",
                    "action_id": "view_details"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Schedule 1:1",
                        "emoji": True
                    },
                    "style": "primary",
                    "value": f"schedule_meeting_{employee_name}",
                    "action_id": "schedule_meeting"
                }
            ]
        })
        
        return blocks
    
    def _get_departure_window(self, risk_score: float) -> str:
        """Get predicted departure window based on risk score"""
        if risk_score >= 0.75:
            return "0-30 days"
        elif risk_score >= 0.5:
            return "30-60 days"
        elif risk_score >= 0.25:
            return "60-90 days"
        else:
            return "90+ days"