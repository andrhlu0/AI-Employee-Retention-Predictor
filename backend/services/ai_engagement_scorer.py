import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import numpy as np
from sqlalchemy.orm import Session
import openai
import json

from services.data_collector import DataCollector
from models.employee import Employee
from config import settings

logger = logging.getLogger(__name__)

class AIEngagementScorer:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.data_collector = DataCollector(db_session)
        openai.api_key = settings.OPENAI_API_KEY
        
    async def calculate_engagement_score(self, employee_id: str) -> Dict:
        """Calculate AI-powered engagement score using multiple data sources"""
        try:
            # Collect data from all sources
            employee_data = self.data_collector.collect_employee_data(
                self.db.query(Employee).filter_by(employee_id=employee_id).first()
            )
            
            # Prepare metrics for AI analysis
            metrics = self._prepare_metrics(employee_data)
            
            # Get AI analysis
            ai_analysis = await self._get_ai_analysis(metrics)
            
            # Calculate final score
            engagement_score = self._calculate_final_score(
                metrics, 
                ai_analysis
            )
            
            return {
                'employee_id': employee_id,
                'engagement_score': engagement_score['score'],
                'confidence': engagement_score['confidence'],
                'factors': engagement_score['factors'],
                'recommendations': ai_analysis.get('recommendations', []),
                'risk_indicators': ai_analysis.get('risk_indicators', []),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating engagement score: {e}")
            raise
    
    def _prepare_metrics(self, employee_data: Dict) -> Dict:
        """Prepare metrics for AI analysis"""
        metrics = {
            'communication': {},
            'productivity': {},
            'collaboration': {},
            'wellbeing': {}
        }
        
        # Slack metrics
        if 'slack_metrics' in employee_data:
            slack = employee_data['slack_metrics']
            metrics['communication'] = {
                'message_frequency': slack.get('message_count', 0) / 30,  # Daily average
                'response_time': slack.get('avg_response_time', 0),
                'sentiment': slack.get('sentiment_score', 0),
                'after_hours_percentage': slack.get('after_hours_messages', 0),
                'channels_active': slack.get('active_channels', 0)
            }
        
        # Email metrics
        if 'email_metrics' in employee_data:
            email = employee_data['email_metrics']
            metrics['communication'].update({
                'email_sent': email.get('sent_count', 0),
                'email_received': email.get('received_count', 0),
                'email_response_time': email.get('avg_response_time', 0),
                'unread_percentage': email.get('unread_percentage', 0)
            })
        
        # Calendar metrics
        if 'calendar_metrics' in employee_data:
            calendar = employee_data['calendar_metrics']
            metrics['collaboration'] = {
                'meeting_hours': calendar.get('total_meeting_hours', 0),
                'one_on_ones': calendar.get('one_on_one_count', 0),
                'declined_meetings': calendar.get('declined_percentage', 0),
                'focus_time': calendar.get('focus_time_hours', 0)
            }
            
            # Wellbeing indicators
            metrics['wellbeing'] = {
                'pto_taken': calendar.get('pto_days', 0),
                'after_hours_meetings': calendar.get('after_hours_meetings', 0),
                'meeting_load': calendar.get('meeting_load_score', 0)
            }
        
        # Productivity metrics
        if 'productivity_metrics' in employee_data:
            prod = employee_data['productivity_metrics']
            metrics['productivity'] = {
                'tasks_completed': prod.get('tasks_completed', 0),
                'projects_active': prod.get('active_projects', 0),
                'deadline_adherence': prod.get('on_time_percentage', 0)
            }
        
        return metrics
    
    async def _get_ai_analysis(self, metrics: Dict) -> Dict:
        """Get AI analysis of engagement metrics"""
        try:
            prompt = f"""
            Analyze the following employee engagement metrics and provide insights:
            
            Communication Metrics:
            {json.dumps(metrics['communication'], indent=2)}
            
            Collaboration Metrics:
            {json.dumps(metrics['collaboration'], indent=2)}
            
            Wellbeing Metrics:
            {json.dumps(metrics['wellbeing'], indent=2)}
            
            Productivity Metrics:
            {json.dumps(metrics['productivity'], indent=2)}
            
            Based on these metrics, provide:
            1. An engagement score from 0-1 (0 being disengaged, 1 being highly engaged)
            2. Key risk indicators if any
            3. Specific recommendations for improvement
            4. Confidence level in the assessment (0-1)
            
            Return the response in JSON format with keys: 
            engagement_score, risk_indicators, recommendations, confidence_level, key_factors
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert HR analyst specializing in employee engagement and retention."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error(f"Error getting AI analysis: {e}")
            # Fallback to rule-based scoring
            return self._fallback_analysis(metrics)
    
    def _fallback_analysis(self, metrics: Dict) -> Dict:
        """Fallback rule-based analysis if AI is unavailable"""
        score = 0.5
        risk_indicators = []
        recommendations = []
        
        # Communication analysis
        comm = metrics.get('communication', {})
        if comm.get('sentiment', 0) < 0.3:
            score -= 0.1
            risk_indicators.append("Low sentiment in communications")
            recommendations.append("Schedule 1-on-1 to discuss concerns")
        
        if comm.get('after_hours_percentage', 0) > 30:
            score -= 0.05
            risk_indicators.append("High after-hours communication")
            recommendations.append("Review workload and work-life balance")
        
        # Collaboration analysis
        collab = metrics.get('collaboration', {})
        if collab.get('declined_meetings', 0) > 25:
            score -= 0.05
            risk_indicators.append("High meeting decline rate")
        
        if collab.get('one_on_ones', 0) < 2:
            recommendations.append("Increase 1-on-1 meetings with manager")
        
        # Wellbeing analysis
        wellbeing = metrics.get('wellbeing', {})
        if wellbeing.get('pto_taken', 0) < 5:
            recommendations.append("Encourage taking time off")
        
        return {
            'engagement_score': max(0, min(1, score)),
            'risk_indicators': risk_indicators,
            'recommendations': recommendations,
            'confidence_level': 0.7,
            'key_factors': ['communication_sentiment', 'work_hours', 'meeting_participation']
        }
    
    def _calculate_final_score(self, metrics: Dict, ai_analysis: Dict) -> Dict:
        """Calculate final engagement score combining metrics and AI analysis"""
        ai_score = ai_analysis.get('engagement_score', 0.5)
        confidence = ai_analysis.get('confidence_level', 0.7)
        
        # Weight different factors
        factors = {
            'ai_analysis': ai_score * 0.4,
            'communication': self._score_communication(metrics.get('communication', {})) * 0.2,
            'collaboration': self._score_collaboration(metrics.get('collaboration', {})) * 0.2,
            'wellbeing': self._score_wellbeing(metrics.get('wellbeing', {})) * 0.1,
            'productivity': self._score_productivity(metrics.get('productivity', {})) * 0.1
        }
        
        final_score = sum(factors.values())
        
        return {
            'score': round(final_score, 3),
            'confidence': confidence,
            'factors': factors,
            'ai_insights': ai_analysis.get('key_factors', [])
        }
    
    def _score_communication(self, comm_metrics: Dict) -> float:
        """Score communication engagement"""
        score = 0.5
        
        if comm_metrics.get('sentiment', 0) > 0.6:
            score += 0.2
        elif comm_metrics.get('sentiment', 0) < 0.3:
            score -= 0.2
        
        if comm_metrics.get('response_time', 100) < 60:
            score += 0.1
        
        if comm_metrics.get('after_hours_percentage', 0) < 20:
            score += 0.1
        elif comm_metrics.get('after_hours_percentage', 0) > 40:
            score -= 0.1
        
        return max(0, min(1, score))
    
    def _score_collaboration(self, collab_metrics: Dict) -> float:
        """Score collaboration engagement"""
        score = 0.5
        
        if collab_metrics.get('one_on_ones', 0) >= 4:
            score += 0.2
        elif collab_metrics.get('one_on_ones', 0) < 2:
            score -= 0.2
        
        if collab_metrics.get('declined_meetings', 0) < 10:
            score += 0.1
        elif collab_metrics.get('declined_meetings', 0) > 30:
            score -= 0.2
        
        return max(0, min(1, score))
    
    def _score_wellbeing(self, wellbeing_metrics: Dict) -> float:
        """Score wellbeing indicators"""
        score = 0.5
        
        if wellbeing_metrics.get('pto_taken', 0) >= 10:
            score += 0.2
        elif wellbeing_metrics.get('pto_taken', 0) < 5:
            score -= 0.1
        
        if wellbeing_metrics.get('after_hours_meetings', 0) < 5:
            score += 0.1
        elif wellbeing_metrics.get('after_hours_meetings', 0) > 15:
            score -= 0.2
        
        return max(0, min(1, score))
    
    def _score_productivity(self, prod_metrics: Dict) -> float:
        """Score productivity engagement"""
        score = 0.5
        
        if prod_metrics.get('deadline_adherence', 0) > 80:
            score += 0.2
        elif prod_metrics.get('deadline_adherence', 0) < 60:
            score -= 0.2
        
        if prod_metrics.get('tasks_completed', 0) > 20:
            score += 0.1
        
        return max(0, min(1, score))