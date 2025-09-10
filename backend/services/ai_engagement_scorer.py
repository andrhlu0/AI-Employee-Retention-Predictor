# backend/services/ai_engagement_scorer.py
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import numpy as np
from enum import Enum
import asyncio
import aiohttp
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)

class EngagementLevel(Enum):
    HIGHLY_ENGAGED = "highly_engaged"
    ENGAGED = "engaged"
    NEUTRAL = "neutral"
    AT_RISK = "at_risk"
    DISENGAGED = "disengaged"

@dataclass
class EngagementMetrics:
    communication_score: float
    collaboration_score: float
    productivity_score: float
    wellbeing_score: float
    overall_score: float
    confidence: float
    level: EngagementLevel

class AIEngagementScorer:
    """Calculate engagement scores using AI analysis of communication and activity patterns"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')  # Alternative
        self.use_openai = bool(self.openai_api_key)
        self.use_anthropic = bool(self.anthropic_api_key)
        
        if not self.use_openai and not self.use_anthropic:
            logger.warning("No AI API keys configured. Using fallback scoring method.")
    
    async def calculate_engagement_score(self, employee_data: Dict) -> Dict:
        """Calculate comprehensive engagement score for an employee"""
        try:
            # Extract and prepare metrics
            metrics = self._prepare_metrics(employee_data)
            
            # Get AI analysis if API is configured
            if self.use_openai or self.use_anthropic:
                ai_analysis = await self._get_ai_analysis(metrics)
            else:
                # Fallback to rule-based scoring
                ai_analysis = self._get_fallback_analysis(metrics)
            
            # Calculate component scores
            scores = self._calculate_component_scores(metrics, ai_analysis)
            
            # Determine engagement level
            engagement_level = self._determine_engagement_level(scores['overall_score'])
            
            # Generate recommendations
            recommendations = self._generate_recommendations(scores, ai_analysis)
            
            return {
                'employee_id': employee_data.get('employee_id'),
                'engagement_score': scores['overall_score'],
                'engagement_level': engagement_level.value,
                'components': {
                    'communication': scores['communication_score'],
                    'collaboration': scores['collaboration_score'],
                    'productivity': scores['productivity_score'],
                    'wellbeing': scores['wellbeing_score']
                },
                'confidence': ai_analysis.get('confidence_level', 0.7),
                'risk_indicators': ai_analysis.get('risk_indicators', []),
                'recommendations': recommendations,
                'key_factors': ai_analysis.get('key_factors', []),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating engagement score: {e}")
            return self._get_default_score(employee_data.get('employee_id'))
    
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
                'message_frequency': slack.get('message_count', 0) / 30,
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
                'focus_time': calendar.get('focus_time_hours', 0),
                'collaboration_hours': calendar.get('collaboration_hours', 0)
            }
            
            metrics['wellbeing'] = {
                'pto_taken': calendar.get('pto_days', 0),
                'after_hours_meetings': calendar.get('after_hours_meetings', 0),
                'meeting_load': calendar.get('meeting_load_score', 0),
                'weekend_work': calendar.get('weekend_hours', 0)
            }
        
        # Productivity metrics
        if 'productivity_metrics' in employee_data:
            prod = employee_data['productivity_metrics']
            metrics['productivity'] = {
                'tasks_completed': prod.get('tasks_completed', 0),
                'projects_active': prod.get('active_projects', 0),
                'deadline_adherence': prod.get('on_time_percentage', 0),
                'velocity': prod.get('velocity_score', 0)
            }
        
        return metrics
    
    async def _get_ai_analysis(self, metrics: Dict) -> Dict:
        """Get AI analysis of engagement metrics"""
        if self.use_openai:
            return await self._get_openai_analysis(metrics)
        elif self.use_anthropic:
            return await self._get_anthropic_analysis(metrics)
        else:
            return self._get_fallback_analysis(metrics)
    
    async def _get_openai_analysis(self, metrics: Dict) -> Dict:
        """Get analysis from OpenAI API"""
        try:
            prompt = self._create_analysis_prompt(metrics)
            
            headers = {
                'Authorization': f'Bearer {self.openai_api_key}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'model': 'gpt-4',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are an expert HR analyst specializing in employee engagement and retention. Analyze metrics and provide JSON responses only.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': 0.3,
                'max_tokens': 1000
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.openai.com/v1/chat/completions',
                    headers=headers,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result['choices'][0]['message']['content']
                        return json.loads(content)
                    else:
                        logger.error(f"OpenAI API error: {response.status}")
                        return self._get_fallback_analysis(metrics)
                        
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return self._get_fallback_analysis(metrics)
    
    async def _get_anthropic_analysis(self, metrics: Dict) -> Dict:
        """Get analysis from Anthropic Claude API"""
        try:
            prompt = self._create_analysis_prompt(metrics)
            
            headers = {
                'x-api-key': self.anthropic_api_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
            
            data = {
                'model': 'claude-3-haiku-20240307',
                'max_tokens': 1000,
                'messages': [
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': 0.3
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.anthropic.com/v1/messages',
                    headers=headers,
                    json=data
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result['content'][0]['text']
                        return json.loads(content)
                    else:
                        logger.error(f"Anthropic API error: {response.status}")
                        return self._get_fallback_analysis(metrics)
                        
        except Exception as e:
            logger.error(f"Error calling Anthropic API: {e}")
            return self._get_fallback_analysis(metrics)
    
    def _create_analysis_prompt(self, metrics: Dict) -> str:
        """Create prompt for AI analysis"""
        return f"""
        Analyze the following employee engagement metrics and provide insights.
        
        Communication Metrics:
        {json.dumps(metrics['communication'], indent=2)}
        
        Collaboration Metrics:
        {json.dumps(metrics['collaboration'], indent=2)}
        
        Wellbeing Metrics:
        {json.dumps(metrics['wellbeing'], indent=2)}
        
        Productivity Metrics:
        {json.dumps(metrics['productivity'], indent=2)}
        
        Based on these metrics, provide a JSON response with the following structure:
        {{
            "engagement_score": 0.0-1.0,
            "risk_indicators": ["list of specific risks"],
            "recommendations": ["list of actionable recommendations"],
            "confidence_level": 0.0-1.0,
            "key_factors": ["list of main factors affecting engagement"]
        }}
        
        Consider:
        - Message frequency and sentiment
        - Work-life balance indicators
        - Collaboration patterns
        - Productivity trends
        - After-hours activity
        
        Return ONLY valid JSON, no additional text.
        """
    
    def _get_fallback_analysis(self, metrics: Dict) -> Dict:
        """Rule-based fallback analysis when AI is not available"""
        engagement_score = 0.0
        risk_indicators = []
        recommendations = []
        key_factors = []
        
        # Analyze communication
        comm = metrics.get('communication', {})
        if comm:
            msg_freq = comm.get('message_frequency', 0)
            sentiment = comm.get('sentiment', 0)
            
            if msg_freq < 5:
                risk_indicators.append("Low communication frequency")
                recommendations.append("Encourage more team interaction")
            
            if sentiment < -0.3:
                risk_indicators.append("Negative communication sentiment")
                key_factors.append("Poor sentiment in communications")
            
            comm_score = (min(msg_freq / 20, 1.0) * 0.5 + (sentiment + 1) / 2 * 0.5)
            engagement_score += comm_score * 0.25
        
        # Analyze collaboration
        collab = metrics.get('collaboration', {})
        if collab:
            meeting_hours = collab.get('meeting_hours', 0)
            one_on_ones = collab.get('one_on_ones', 0)
            
            if one_on_ones < 2:
                risk_indicators.append("Insufficient 1-on-1 meetings")
                recommendations.append("Schedule regular check-ins with manager")
            
            if meeting_hours > 30:
                risk_indicators.append("Meeting overload")
                key_factors.append("Excessive meeting time")
            
            collab_score = min(meeting_hours / 20, 1.0) * 0.7 + min(one_on_ones / 4, 1.0) * 0.3
            engagement_score += collab_score * 0.25
        
        # Analyze wellbeing
        wellbeing = metrics.get('wellbeing', {})
        if wellbeing:
            after_hours = wellbeing.get('after_hours_meetings', 0)
            pto_taken = wellbeing.get('pto_taken', 0)
            
            if after_hours > 5:
                risk_indicators.append("High after-hours work")
                key_factors.append("Work-life balance concerns")
            
            if pto_taken < 5:
                recommendations.append("Encourage taking time off")
            
            wellbeing_score = max(0, 1 - after_hours / 10) * 0.5 + min(pto_taken / 15, 1.0) * 0.5
            engagement_score += wellbeing_score * 0.25
        
        # Analyze productivity
        prod = metrics.get('productivity', {})
        if prod:
            tasks = prod.get('tasks_completed', 0)
            deadline_adherence = prod.get('deadline_adherence', 0)
            
            if deadline_adherence < 0.7:
                risk_indicators.append("Missing deadlines frequently")
                recommendations.append("Review workload and priorities")
            
            prod_score = min(tasks / 50, 1.0) * 0.4 + deadline_adherence * 0.6
            engagement_score += prod_score * 0.25
        
        # Set default if no metrics
        if engagement_score == 0:
            engagement_score = 0.5
            recommendations.append("Insufficient data - enable integrations for better insights")
        
        return {
            'engagement_score': round(engagement_score, 2),
            'risk_indicators': risk_indicators[:5],
            'recommendations': recommendations[:5],
            'confidence_level': 0.7 if metrics else 0.3,
            'key_factors': key_factors[:3]
        }
    
    def _calculate_component_scores(self, metrics: Dict, ai_analysis: Dict) -> Dict:
        """Calculate individual component scores"""
        base_score = ai_analysis.get('engagement_score', 0.5)
        
        # Calculate individual components based on metrics
        comm_metrics = metrics.get('communication', {})
        comm_score = self._score_communication(comm_metrics)
        
        collab_metrics = metrics.get('collaboration', {})
        collab_score = self._score_collaboration(collab_metrics)
        
        prod_metrics = metrics.get('productivity', {})
        prod_score = self._score_productivity(prod_metrics)
        
        well_metrics = metrics.get('wellbeing', {})
        well_score = self._score_wellbeing(well_metrics)
        
        # Weight the overall score
        overall = (
            comm_score * 0.25 +
            collab_score * 0.25 +
            prod_score * 0.25 +
            well_score * 0.25
        ) * 0.7 + base_score * 0.3  # Blend AI and calculated scores
        
        return {
            'communication_score': round(comm_score, 2),
            'collaboration_score': round(collab_score, 2),
            'productivity_score': round(prod_score, 2),
            'wellbeing_score': round(well_score, 2),
            'overall_score': round(overall, 2)
        }
    
    def _score_communication(self, metrics: Dict) -> float:
        """Score communication engagement"""
        if not metrics:
            return 0.5
        
        scores = []
        
        # Message frequency (optimal is 10-30 per day)
        msg_freq = metrics.get('message_frequency', 0)
        if msg_freq < 5:
            scores.append(msg_freq / 5 * 0.5)
        elif msg_freq <= 30:
            scores.append(0.5 + (msg_freq - 5) / 25 * 0.5)
        else:
            scores.append(max(0.3, 1 - (msg_freq - 30) / 30))
        
        # Sentiment (-1 to 1)
        sentiment = metrics.get('sentiment', 0)
        scores.append((sentiment + 1) / 2)
        
        # Response time (faster is better, optimal < 30 min)
        response_time = metrics.get('response_time', 60)
        scores.append(max(0, 1 - response_time / 120))
        
        return np.mean(scores) if scores else 0.5
    
    def _score_collaboration(self, metrics: Dict) -> float:
        """Score collaboration engagement"""
        if not metrics:
            return 0.5
        
        scores = []
        
        # Meeting participation (optimal 10-20 hours/week)
        meeting_hours = metrics.get('meeting_hours', 0)
        if meeting_hours < 5:
            scores.append(meeting_hours / 5 * 0.5)
        elif meeting_hours <= 20:
            scores.append(0.5 + (meeting_hours - 5) / 15 * 0.5)
        else:
            scores.append(max(0.3, 1 - (meeting_hours - 20) / 20))
        
        # 1-on-1s (optimal 2-4 per month)
        one_on_ones = metrics.get('one_on_ones', 0)
        scores.append(min(1.0, one_on_ones / 3))
        
        # Focus time (optimal > 15 hours/week)
        focus_time = metrics.get('focus_time', 0)
        scores.append(min(1.0, focus_time / 15))
        
        return np.mean(scores) if scores else 0.5
    
    def _score_productivity(self, metrics: Dict) -> float:
        """Score productivity engagement"""
        if not metrics:
            return 0.5
        
        scores = []
        
        # Task completion
        tasks = metrics.get('tasks_completed', 0)
        scores.append(min(1.0, tasks / 30))
        
        # Deadline adherence
        deadline_score = metrics.get('deadline_adherence', 0)
        scores.append(deadline_score)
        
        # Active projects (optimal 2-5)
        projects = metrics.get('projects_active', 0)
        if projects < 1:
            scores.append(0.3)
        elif projects <= 5:
            scores.append(0.7 + projects * 0.06)
        else:
            scores.append(max(0.4, 1 - (projects - 5) / 5))
        
        return np.mean(scores) if scores else 0.5
    
    def _score_wellbeing(self, metrics: Dict) -> float:
        """Score wellbeing indicators"""
        if not metrics:
            return 0.5
        
        scores = []
        
        # PTO usage (healthy is 10-20 days/year)
        pto = metrics.get('pto_taken', 0)
        scores.append(min(1.0, pto / 15))
        
        # After hours work (less is better)
        after_hours = metrics.get('after_hours_meetings', 0)
        scores.append(max(0, 1 - after_hours / 10))
        
        # Meeting load
        meeting_load = metrics.get('meeting_load', 0.5)
        scores.append(1 - meeting_load)
        
        # Weekend work (none is best)
        weekend_work = metrics.get('weekend_work', 0)
        scores.append(max(0, 1 - weekend_work / 5))
        
        return np.mean(scores) if scores else 0.5
    
    def _determine_engagement_level(self, score: float) -> EngagementLevel:
        """Determine engagement level from score"""
        if score >= 0.8:
            return EngagementLevel.HIGHLY_ENGAGED
        elif score >= 0.65:
            return EngagementLevel.ENGAGED
        elif score >= 0.5:
            return EngagementLevel.NEUTRAL
        elif score >= 0.35:
            return EngagementLevel.AT_RISK
        else:
            return EngagementLevel.DISENGAGED
    
    def _generate_recommendations(self, scores: Dict, ai_analysis: Dict) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = ai_analysis.get('recommendations', [])
        
        # Add score-based recommendations
        if scores['communication_score'] < 0.5:
            recommendations.append("Increase team communication and collaboration")
        
        if scores['wellbeing_score'] < 0.5:
            recommendations.append("Review work-life balance and meeting load")
        
        if scores['productivity_score'] < 0.5:
            recommendations.append("Assess workload distribution and priorities")
        
        if scores['collaboration_score'] < 0.5:
            recommendations.append("Schedule regular 1-on-1s and team activities")
        
        # Deduplicate and limit
        seen = set()
        unique_recs = []
        for rec in recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recs.append(rec)
        
        return unique_recs[:5]
    
    def _get_default_score(self, employee_id: str) -> Dict:
        """Return default score when calculation fails"""
        return {
            'employee_id': employee_id,
            'engagement_score': 0.5,
            'engagement_level': EngagementLevel.NEUTRAL.value,
            'components': {
                'communication': 0.5,
                'collaboration': 0.5,
                'productivity': 0.5,
                'wellbeing': 0.5
            },
            'confidence': 0.1,
            'risk_indicators': ['Insufficient data'],
            'recommendations': ['Enable integrations for accurate scoring'],
            'key_factors': [],
            'timestamp': datetime.now().isoformat()
        }
    
    async def batch_calculate(self, employees_data: List[Dict]) -> List[Dict]:
        """Calculate engagement scores for multiple employees"""
        tasks = [self.calculate_engagement_score(emp) for emp in employees_data]
        results = await asyncio.gather(*tasks)
        return results