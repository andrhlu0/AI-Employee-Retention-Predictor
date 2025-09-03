import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import requests

from config import settings

logger = logging.getLogger(__name__)

class ProductivityIntegration:
    """Integration for productivity tools (JIRA, GitHub, etc.)"""
    
    def __init__(self):
        self.jira_url = "https://company.atlassian.net"
        self.github_url = "https://api.github.com"
        # Add authentication as needed
    
    def get_productivity_metrics(self, employee_id: str) -> Dict:
        """Get productivity metrics from various tools"""
        try:
            metrics = {}
            
            # Get JIRA metrics
            jira_metrics = self._get_jira_metrics(employee_id)
            metrics.update(jira_metrics)
            
            # Get GitHub metrics
            github_metrics = self._get_github_metrics(employee_id)
            metrics.update(github_metrics)
            
            # Calculate composite scores
            metrics['performance_trend'] = self._calculate_performance_trend(metrics)
            metrics['skill_utilization_score'] = self._calculate_skill_utilization(metrics)
            metrics['workload_score'] = self._calculate_workload_balance(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting productivity metrics: {e}")
            return self._get_default_metrics()
    
    def _get_jira_metrics(self, employee_id: str) -> Dict:
        """Get metrics from JIRA"""
        # Simplified implementation - would use JIRA API
        return {
            'completion_rate': 0.85,
            'active_projects': 3,
            'avg_resolution_hours': 24,
            'tickets_completed_30d': 15,
            'tickets_in_progress': 5,
            'overdue_tasks': 1
        }
    
    def _get_github_metrics(self, employee_id: str) -> Dict:
        """Get metrics from GitHub"""
        # Simplified implementation - would use GitHub API
        return {
            'code_commits_30d': 45,
            'pull_requests_30d': 12,
            'code_reviews_30d': 8,
            'lines_changed_30d': 2500
        }
    
    def _calculate_performance_trend(self, metrics: Dict) -> str:
        """Calculate performance trend based on metrics"""
        # Simplified logic
        if metrics.get('completion_rate', 0) < 0.7:
            return 'declining'
        elif metrics.get('completion_rate', 0) > 0.9:
            return 'improving'
        return 'stable'
    
    def _calculate_skill_utilization(self, metrics: Dict) -> float:
        """Calculate skill utilization score"""
        # Simplified calculation
        commits = metrics.get('code_commits_30d', 0)
        reviews = metrics.get('code_reviews_30d', 0)
        tasks = metrics.get('tickets_completed_30d', 0)
        
        if commits > 30 and reviews > 5 and tasks > 10:
            return 0.9
        elif commits > 15 and reviews > 2 and tasks > 5:
            return 0.7
        else:
            return 0.5
    
    def _calculate_workload_balance(self, metrics: Dict) -> float:
        """Calculate workload balance score"""
        # Simplified calculation
        in_progress = metrics.get('tickets_in_progress', 0)
        overdue = metrics.get('overdue_tasks', 0)
        
        if overdue > 3 or in_progress > 10:
            return 0.3  # Overloaded
        elif overdue == 0 and in_progress < 5:
            return 0.9  # Well balanced
        else:
            return 0.6  # Normal
    
    def _get_default_metrics(self) -> Dict:
        """Return default metrics when APIs unavailable"""
        return {
            'completion_rate': 0.8,
            'active_projects': 2,
            'code_commits_30d': 20,
            'avg_resolution_hours': 24,
            'performance_trend': 'stable',
            'skill_utilization_score': 0.7,
            'workload_score': 0.7
        }