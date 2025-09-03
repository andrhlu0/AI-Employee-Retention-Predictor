import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from textblob import TextBlob
import re

from config import settings

logger = logging.getLogger(__name__)

class SlackIntegration:
    def __init__(self):
        self.client = WebClient(token=settings.SLACK_BOT_TOKEN)
    
    def get_user_metrics(self, user_id: str, start_date: datetime, end_date: datetime) -> Dict:
        """Get comprehensive Slack metrics for a user"""
        try:
            metrics = {
                'total_messages': 0,
                'channels_active': set(),
                'response_times': [],
                'sentiments': [],
                'after_hours_count': 0,
                'total_count': 0,
                'mentions_received': 0,
                'threads_started': 0,
                'reactions_given': 0,
                'reactions_received': 0
            }
            
            # Get user's channels
            channels = self._get_user_channels(user_id)
            
            for channel in channels:
                channel_metrics = self._analyze_channel_activity(
                    channel['id'], user_id, start_date, end_date
                )
                metrics = self._merge_metrics(metrics, channel_metrics)
            
            # Calculate aggregated metrics
            return self._calculate_final_metrics(metrics)
            
        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            return {}
        except Exception as e:
            logger.error(f"Error getting Slack metrics: {e}")
            return {}
    
    def _get_user_channels(self, user_id: str) -> List[Dict]:
        """Get all channels the user is a member of"""
        channels = []
        try:
            result = self.client.users_conversations(user=user_id)
            channels = result['channels']
        except SlackApiError as e:
            logger.error(f"Error getting user channels: {e}")
        return channels
    
    def _analyze_channel_activity(self, channel_id: str, user_id: str, 
                                 start_date: datetime, end_date: datetime) -> Dict:
        """Analyze user activity in a specific channel"""
        metrics = {
            'messages': [],
            'response_times': [],
            'sentiments': [],
            'after_hours_count': 0
        }
        
        try:
            # Get messages in channel
            result = self.client.conversations_history(
                channel=channel_id,
                oldest=start_date.timestamp(),
                latest=end_date.timestamp()
            )
            
            messages = result.get('messages', [])
            user_messages = [m for m in messages if m.get('user') == user_id]
            
            for msg in user_messages:
                # Sentiment analysis
                if msg.get('text'):
                    sentiment = self._analyze_sentiment(msg['text'])
                    metrics['sentiments'].append(sentiment)
                
                # After hours detection
                msg_time = datetime.fromtimestamp(float(msg['ts']))
                if msg_time.hour < 9 or msg_time.hour >= 18:
                    metrics['after_hours_count'] += 1
                
                # Response time calculation
                response_time = self._calculate_response_time(messages, msg, user_id)
                if response_time:
                    metrics['response_times'].append(response_time)
            
            metrics['messages'] = user_messages
            
        except SlackApiError as e:
            logger.error(f"Error analyzing channel {channel_id}: {e}")
        
        return metrics
    
    def _analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment of message text"""
        try:
            # Clean text
            text = re.sub(r'<@\w+>', '', text)  # Remove mentions
            text = re.sub(r':\w+:', '', text)   # Remove emojis
            
            blob = TextBlob(text)
            return blob.sentiment.polarity
        except:
            return 0.0
    
    def _calculate_response_time(self, messages: List[Dict], current_msg: Dict, 
                                user_id: str) -> Optional[float]:
        """Calculate response time to mentions"""
        # Simplified implementation
        if '<@' in current_msg.get('text', ''):
            # This is a response to someone
            return None
        
        # Look for responses to this message
        current_ts = float(current_msg['ts'])
        for msg in messages:
            if msg.get('thread_ts') == current_msg['ts'] and msg.get('user') != user_id:
                response_ts = float(msg['ts'])
                return (response_ts - current_ts) / 60  # Convert to minutes
        
        return None
    
    def _merge_metrics(self, total: Dict, channel: Dict) -> Dict:
        """Merge channel metrics into total"""
        total['total_messages'] += len(channel.get('messages', []))
        total['response_times'].extend(channel.get('response_times', []))
        total['sentiments'].extend(channel.get('sentiments', []))
        total['after_hours_count'] += channel.get('after_hours_count', 0)
        return total
    
    def _calculate_final_metrics(self, metrics: Dict) -> Dict:
        """Calculate final aggregated metrics"""
        total_messages = metrics['total_messages']
        
        return {
            'total_messages': total_messages,
            'active_channels': len(metrics.get('channels_active', [])),
            'avg_response_time_minutes': (
                sum(metrics['response_times']) / len(metrics['response_times']) 
                if metrics['response_times'] else 0
            ),
            'avg_sentiment': (
                sum(metrics['sentiments']) / len(metrics['sentiments'])
                if metrics['sentiments'] else 0
            ),
            'after_hours_percentage': (
                (metrics['after_hours_count'] / total_messages * 100) 
                if total_messages > 0 else 0
            ),
            'mentions_received': metrics.get('mentions_received', 0),
            'participation_trend': self._calculate_trend(metrics)
        }
    
    def _calculate_trend(self, metrics: Dict) -> str:
        """Calculate participation trend"""
        # Simplified trend calculation
        if metrics['total_messages'] < 10:
            return 'declining'
        elif metrics['total_messages'] > 50:
            return 'improving'
        return 'stable'