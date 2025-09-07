# backend/integrations/productivity_integration.py
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import random
import statistics
from collections import defaultdict

logger = logging.getLogger(__name__)

class ProductivityIntegration:
    """
    Integrates with various productivity tools to analyze work patterns.
    In production, this would connect to tools like Jira, GitHub, GitLab, etc.
    """
    
    def __init__(self):
        self.jira_client = None
        self.github_client = None
        self.gitlab_client = None
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize connections to productivity tools"""
        # In production, initialize actual API clients here
        pass
    
    def get_productivity_metrics(self, employee_id: str, start_date: datetime, 
                                end_date: datetime) -> Dict:
        """Get comprehensive productivity metrics for an employee"""
        try:
            metrics = {
                # Task Management Metrics
                'tasks_completed': 0,
                'tasks_in_progress': 0,
                'tasks_overdue': 0,
                'avg_task_completion_time': 0,
                'task_completion_rate': 0,
                
                # Code/Development Metrics (if applicable)
                'code_commits': 0,
                'pull_requests_created': 0,
                'pull_requests_reviewed': 0,
                'code_review_turnaround': 0,
                'lines_of_code_changed': 0,
                
                # Project Involvement
                'projects_active': 0,
                'project_contribution_score': 0,
                
                # Time Management
                'focus_time_hours': 0,
                'context_switches': 0,
                'deadline_adherence': 0,
                
                # Quality Metrics
                'bug_fix_rate': 0,
                'rework_percentage': 0,
                'quality_score': 0,
                
                # Collaboration Metrics
                'peer_feedback_score': 0,
                'team_contribution': 0,
                
                # Performance Trends
                'performance_trend': 'stable',  # declining, stable, improving
                'productivity_score': 0,
                'workload_balance': 0,
                'skill_utilization': 0
            }
            
            # Collect from different sources
            task_metrics = self._get_task_metrics(employee_id, start_date, end_date)
            code_metrics = self._get_code_metrics(employee_id, start_date, end_date)
            project_metrics = self._get_project_metrics(employee_id, start_date, end_date)
            quality_metrics = self._get_quality_metrics(employee_id, start_date, end_date)
            
            # Merge all metrics
            metrics.update(task_metrics)
            metrics.update(code_metrics)
            metrics.update(project_metrics)
            metrics.update(quality_metrics)
            
            # Calculate composite scores
            metrics['productivity_score'] = self._calculate_productivity_score(metrics)
            metrics['workload_balance'] = self._calculate_workload_balance(metrics)
            metrics['skill_utilization'] = self._calculate_skill_utilization(metrics)
            metrics['performance_trend'] = self._determine_performance_trend(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting productivity metrics: {e}")
            return self._get_demo_metrics()
    
    def _get_task_metrics(self, employee_id: str, start_date: datetime, 
                         end_date: datetime) -> Dict:
        """Get task management metrics (Jira, Asana, etc.)"""
        # In production, this would query actual task management systems
        # For demo, generate realistic data
        
        total_tasks = random.randint(20, 100)
        completed = random.randint(int(total_tasks * 0.6), int(total_tasks * 0.95))
        in_progress = random.randint(2, 10)
        overdue = random.randint(0, 5)
        
        return {
            'tasks_completed': completed,
            'tasks_in_progress': in_progress,
            'tasks_overdue': overdue,
            'avg_task_completion_time': random.uniform(1, 10),  # days
            'task_completion_rate': completed / total_tasks if total_tasks > 0 else 0,
            'ticket_resolution_time': random.uniform(4, 48)  # hours
        }
    
    def _get_code_metrics(self, employee_id: str, start_date: datetime, 
                         end_date: datetime) -> Dict:
        """Get code/development metrics (GitHub, GitLab, Bitbucket)"""
        # In production, query version control systems
        
        is_developer = random.choice([True, False])
        
        if is_developer:
            return {
                'code_commits': random.randint(10, 150),
                'pull_requests_created': random.randint(2, 30),
                'pull_requests_reviewed': random.randint(5, 40),
                'code_review_turnaround': random.uniform(2, 24),  # hours
                'lines_of_code_changed': random.randint(100, 5000),
                'code_quality_score': random.uniform(0.7, 0.95)
            }
        else:
            return {
                'code_commits': 0,
                'pull_requests_created': 0,
                'pull_requests_reviewed': 0,
                'code_review_turnaround': 0,
                'lines_of_code_changed': 0
            }
    
    def _get_project_metrics(self, employee_id: str, start_date: datetime, 
                            end_date: datetime) -> Dict:
        """Get project involvement metrics"""
        projects = random.randint(1, 5)
        
        return {
            'projects_active': projects,
            'project_contribution_score': random.uniform(0.5, 1.0),
            'project_involvement': projects,
            'cross_team_collaboration': random.uniform(0, 1),
            'initiative_participation': random.randint(0, 3)
        }
    
    def _get_quality_metrics(self, employee_id: str, start_date: datetime, 
                            end_date: datetime) -> Dict:
        """Get quality and performance metrics"""
        return {
            'bug_fix_rate': random.uniform(0.7, 0.95),
            'rework_percentage': random.uniform(0.05, 0.25),
            'quality_score': random.uniform(0.6, 0.95),
            'peer_feedback_score': random.uniform(3.5, 5.0),  # out of 5
            'team_contribution': random.uniform(0.5, 1.0),
            'documentation_quality': random.uniform(0.6, 0.9)
        }
    
    def _calculate_productivity_score(self, metrics: Dict) -> float:
        """Calculate overall productivity score (0-1)"""
        factors = []
        
        # Task completion
        if metrics.get('task_completion_rate'):
            factors.append(metrics['task_completion_rate'])
        
        # Code productivity (if applicable)
        if metrics.get('code_commits', 0) > 0:
            code_score = min(metrics['code_commits'] / 100, 1.0)
            factors.append(code_score)
        
        # Project involvement
        if metrics.get('project_contribution_score'):
            factors.append(metrics['project_contribution_score'])
        
        # Quality
        if metrics.get('quality_score'):
            factors.append(metrics['quality_score'])
        
        # Deadline adherence (inverse of overdue tasks)
        overdue_score = 1 - min(metrics.get('tasks_overdue', 0) / 10, 1.0)
        factors.append(overdue_score)
        
        return statistics.mean(factors) if factors else 0.5
    
    def _calculate_workload_balance(self, metrics: Dict) -> float:
        """Calculate workload balance score (0-1, where 1 is well-balanced)"""
        # Analyze if employee is overloaded or underutilized
        
        tasks_in_progress = metrics.get('tasks_in_progress', 0)
        overdue_tasks = metrics.get('tasks_overdue', 0)
        projects = metrics.get('projects_active', 0)
        
        # Ideal ranges
        ideal_tasks = 5
        ideal_projects = 2
        
        # Calculate deviation from ideal
        task_deviation = abs(tasks_in_progress - ideal_tasks) / ideal_tasks
        project_deviation = abs(projects - ideal_projects) / ideal_projects
        overdue_penalty = min(overdue_tasks / 5, 1.0)
        
        balance = 1 - statistics.mean([task_deviation, project_deviation, overdue_penalty])
        return max(0, min(1, balance))
    
    def _calculate_skill_utilization(self, metrics: Dict) -> float:
        """Calculate how well employee skills are being utilized"""
        factors = []
        
        # Project diversity
        project_score = min(metrics.get('projects_active', 0) / 3, 1.0)
        factors.append(project_score)
        
        # Cross-team collaboration
        if 'cross_team_collaboration' in metrics:
            factors.append(metrics['cross_team_collaboration'])
        
        # Quality of work
        if metrics.get('quality_score'):
            factors.append(metrics['quality_score'])
        
        # Innovation/initiative
        initiative_score = min(metrics.get('initiative_participation', 0) / 2, 1.0)
        factors.append(initiative_score)
        
        return statistics.mean(factors) if factors else 0.5
    
    def _determine_performance_trend(self, metrics: Dict) -> str:
        """Determine if performance is declining, stable, or improving"""
        # In production, this would compare with historical data
        # For demo, use current metrics to estimate trend
        
        productivity = metrics.get('productivity_score', 0.5)
        quality = metrics.get('quality_score', 0.5)
        completion_rate = metrics.get('task_completion_rate', 0.5)
        
        avg_score = statistics.mean([productivity, quality, completion_rate])
        
        if avg_score < 0.4:
            return 'declining'
        elif avg_score > 0.7:
            return 'improving'
        else:
            return 'stable'
    
    def _get_demo_metrics(self) -> Dict:
        """Generate demo metrics for testing"""
        return {
            'tasks_completed': random.randint(15, 50),
            'tasks_in_progress': random.randint(2, 8),
            'tasks_overdue': random.randint(0, 3),
            'avg_task_completion_time': random.uniform(1, 7),
            'task_completion_rate': random.uniform(0.6, 0.95),
            'code_commits': random.randint(0, 100),
            'pull_requests_created': random.randint(0, 20),
            'pull_requests_reviewed': random.randint(0, 30),
            'code_review_turnaround': random.uniform(2, 24),
            'lines_of_code_changed': random.randint(0, 3000),
            'projects_active': random.randint(1, 4),
            'project_contribution_score': random.uniform(0.5, 1.0),
            'project_involvement': random.randint(1, 4),
            'focus_time_hours': random.uniform(10, 30),
            'context_switches': random.randint(5, 50),
            'deadline_adherence': random.uniform(0.7, 0.95),
            'bug_fix_rate': random.uniform(0.7, 0.95),
            'rework_percentage': random.uniform(0.05, 0.20),
            'quality_score': random.uniform(0.6, 0.95),
            'peer_feedback_score': random.uniform(3.0, 5.0),
            'team_contribution': random.uniform(0.5, 1.0),
            'performance_trend': random.choice(['declining', 'stable', 'improving']),
            'productivity_score': random.uniform(0.4, 0.9),
            'workload_balance': random.uniform(0.3, 0.9),
            'skill_utilization': random.uniform(0.4, 0.95),
            'ticket_resolution_time': random.uniform(4, 48)
        }
    
    def analyze_burnout_risk(self, metrics: Dict) -> Dict:
        """Analyze burnout risk based on productivity patterns"""
        risk_factors = {}
        burnout_score = 0
        
        # Check for overwork
        if metrics.get('tasks_in_progress', 0) > 10:
            risk_factors['high_workload'] = True
            burnout_score += 0.2
        
        if metrics.get('tasks_overdue', 0) > 3:
            risk_factors['deadline_pressure'] = True
            burnout_score += 0.15
        
        # Check for poor work-life balance
        if metrics.get('context_switches', 0) > 30:
            risk_factors['excessive_context_switching'] = True
            burnout_score += 0.1
        
        # Check for declining performance
        if metrics.get('performance_trend') == 'declining':
            risk_factors['performance_decline'] = True
            burnout_score += 0.2
        
        # Check workload balance
        if metrics.get('workload_balance', 1) < 0.4:
            risk_factors['poor_workload_balance'] = True
            burnout_score += 0.15
        
        # Check quality issues
        if metrics.get('rework_percentage', 0) > 0.2:
            risk_factors['high_rework'] = True
            burnout_score += 0.1
        
        # Low peer feedback
        if metrics.get('peer_feedback_score', 5) < 3.5:
            risk_factors['low_peer_feedback'] = True
            burnout_score += 0.1
        
        return {
            'burnout_score': min(burnout_score, 1.0),
            'risk_factors': risk_factors,
            'risk_level': 'high' if burnout_score > 0.6 else 'medium' if burnout_score > 0.3 else 'low'
        }
    
    def get_performance_insights(self, employee_id: str, metrics: Dict) -> List[str]:
        """Generate actionable insights based on productivity metrics"""
        insights = []
        
        # Task management insights
        if metrics.get('tasks_overdue', 0) > 3:
            insights.append("Has multiple overdue tasks - may need priority alignment or workload adjustment")
        
        if metrics.get('task_completion_rate', 0) < 0.6:
            insights.append("Low task completion rate - consider reviewing task assignments and blockers")
        
        # Workload insights
        if metrics.get('workload_balance', 1) < 0.4:
            insights.append("Workload appears unbalanced - review current assignments")
        elif metrics.get('workload_balance', 0) > 0.9 and metrics.get('projects_active', 0) < 2:
            insights.append("May be underutilized - consider additional responsibilities")
        
        # Performance trends
        if metrics.get('performance_trend') == 'declining':
            insights.append("Performance trending downward - schedule check-in to understand challenges")
        elif metrics.get('performance_trend') == 'improving':
            insights.append("Performance improving - recognize achievements and maintain momentum")
        
        # Quality insights
        if metrics.get('rework_percentage', 0) > 0.2:
            insights.append("High rework rate detected - may benefit from additional training or clearer requirements")
        
        # Collaboration insights
        if metrics.get('peer_feedback_score', 5) < 3.5:
            insights.append("Below-average peer feedback - explore team dynamics and communication")
        
        # Developer-specific insights
        if metrics.get('code_commits', 0) > 0:
            if metrics.get('code_review_turnaround', 0) > 24:
                insights.append("Slow code review turnaround - may be blocking team progress")
            if metrics.get('pull_requests_reviewed', 0) < metrics.get('pull_requests_created', 0) * 0.5:
                insights.append("Low review participation - encourage more code review engagement")
        
        # Skill utilization
        if metrics.get('skill_utilization', 0) < 0.5:
            insights.append("Skills may be underutilized - explore growth opportunities")
        
        return insights