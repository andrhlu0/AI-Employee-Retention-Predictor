import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List
import logging
from datetime import datetime
import json

from config import settings
from models.employee import Employee

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.alert_email = settings.ALERT_EMAIL
    
    def send_high_risk_alert(self, employee: Employee, prediction_details: Dict):
        """Send alert for high-risk employee"""
        try:
            subject = f"⚠️ High Retention Risk Alert: {employee.name}"
            
            # Build email content
            html_content = self._build_alert_html(employee, prediction_details)
            
            # Send to manager and HR
            recipients = [self.alert_email]
            if employee.manager_id:
                # Get manager email (simplified for demo)
                recipients.append(f"{employee.manager_id}@company.com")
            
            self._send_email(recipients, subject, html_content)
            logger.info(f"Alert sent for employee {employee.employee_id}")
            
        except Exception as e:
            logger.error(f"Error sending alert: {e}")
    
    def _build_alert_html(self, employee: Employee, details: Dict) -> str:
        """Build HTML content for alert email"""
        interventions_html = ""
        for intervention in details.get('suggested_interventions', []):
            interventions_html += f"""
            <li>
                <strong>{intervention['action']}</strong><br>
                Priority: {intervention['priority']} | Timeline: {intervention['timeline']}
            </li>
            """
        
        risk_factors_html = ""
        for factor, level in details.get('risk_factors', {}).items():
            color = '#ff4444' if level == 'high' else '#ffaa00'
            risk_factors_html += f"""
            <span style="background-color: {color}; color: white; padding: 2px 8px; 
                         border-radius: 3px; margin: 2px; display: inline-block;">
                {factor.replace('_', ' ').title()}
            </span>
            """
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">⚠️ High Retention Risk Alert</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3>Employee Information</h3>
                        <table style="width: 100%;">
                            <tr>
                                <td><strong>Name:</strong></td>
                                <td>{employee.name}</td>
                            </tr>
                            <tr>
                                <td><strong>Department:</strong></td>
                                <td>{employee.department}</td>
                            </tr>
                            <tr>
                                <td><strong>Position:</strong></td>
                                <td>{employee.position}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3>Risk Assessment</h3>
                        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0;">
                            <strong>Risk Score:</strong> {details.get('confidence', 0):.1%}<br>
                            <strong>Predicted Departure:</strong> {details.get('departure_window', 'Unknown')}
                        </div>
                        
                        <h4>Risk Factors Identified:</h4>
                        <div style="margin: 10px 0;">
                            {risk_factors_html}
                        </div>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px;">
                        <h3>🎯 Recommended Interventions</h3>
                        <ul style="line-height: 1.8;">
                            {interventions_html}
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #666;">
                        <p>Please take action within the recommended timeline to improve retention likelihood.</p>
                        <a href="#" style="background: #667eea; color: white; padding: 10px 20px; 
                                         text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Full Dashboard
                        </a>
                    </div>
                </div>
            </body>
        </html>
        """
        return html
    
    def _send_email(self, recipients: List[str], subject: str, html_content: str):
        """Send email via SMTP"""
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = self.smtp_user
        msg['To'] = ', '.join(recipients)
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
    
    def send_weekly_summary(self, db_session):
        """Send weekly summary of retention risks"""
        # Implementation for weekly summary
        pass