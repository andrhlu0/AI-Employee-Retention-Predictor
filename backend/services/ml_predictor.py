import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import Dict, Tuple, List, Optional
from datetime import datetime
import os
import json

from services.feature_extractor import FeatureExtractor
from config import settings

logger = logging.getLogger(__name__)

class MLPredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_extractor = FeatureExtractor()
        self.model_path = settings.MODEL_PATH
        self.threshold = settings.PREDICTION_THRESHOLD
        
    def load_model(self) -> bool:
        """Load trained model from disk or train a new one"""
        try:
            model_dir = os.path.dirname(self.model_path)
            if not os.path.exists(model_dir):
                os.makedirs(model_dir)
            
            if os.path.exists(self.model_path):
                logger.info(f"Loading model from {self.model_path}")
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                return True
            else:
                logger.info("No trained model found. Training new model...")
                return self.train_model()
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            # Fall back to demo model
            logger.info("Using demo model")
            self.model = self._create_demo_model()
            return True
    
    def train_model(self, training_data: Optional[pd.DataFrame] = None) -> bool:
        """Train a new retention prediction model"""
        try:
            if training_data is None:
                # Generate synthetic training data for demo
                training_data = self._generate_synthetic_data()
            
            # Prepare features and labels
            X = training_data.drop(['employee_id', 'departed'], axis=1)
            y = training_data['departed']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train XGBoost model
            self.model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                objective='binary:logistic',
                random_state=42
            )
            
            self.model.fit(
                X_train_scaled, 
                y_train,
                eval_set=[(X_test_scaled, y_test)],
                early_stopping_rounds=10,
                verbose=False
            )
            
            # Save model
            self.save_model()
            
            # Log performance
            accuracy = self.model.score(X_test_scaled, y_test)
            logger.info(f"Model trained with accuracy: {accuracy:.2%}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            self.model = self._create_demo_model()
            return False
    
    def predict(self, employee_data: Dict) -> Tuple[float, Dict]:
        """Predict retention risk for a single employee"""
        try:
            # Extract features
            features = self.feature_extractor.extract_features(employee_data)
            
            if self.model is None:
                # Fallback to rule-based prediction
                return self._rule_based_prediction(employee_data)
            
            # Scale features
            features_scaled = self.scaler.transform([features])
            
            # Get prediction and probability
            probability = self.model.predict_proba(features_scaled)[0][1]
            
            # Determine risk level
            risk_level = self._categorize_risk(probability)
            
            # Identify top risk factors
            risk_factors = self._identify_risk_factors(employee_data, features)
            
            # Generate interventions
            interventions = self._generate_interventions(risk_factors, probability)
            
            return probability, {
                'confidence': self._calculate_confidence(features),
                'risk_level': risk_level,
                'risk_factors': risk_factors,
                'departure_window': self._estimate_departure_window(probability),
                'suggested_interventions': interventions
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return self._rule_based_prediction(employee_data)
    
    def _rule_based_prediction(self, employee_data: Dict) -> Tuple[float, Dict]:
        """Fallback rule-based prediction when ML model unavailable"""
        risk_score = 0.0
        risk_factors = {}
        
        # Check communication decline
        slack = employee_data.get('slack_metrics', {})
        if slack.get('participation_trend') == 'declining':
            risk_score += 0.3
            risk_factors['declining_communication'] = 'high'
        
        # Check sentiment
        sentiment = slack.get('sentiment_score', 0)
        if sentiment < -0.2:
            risk_score += 0.2
            risk_factors['negative_sentiment'] = 'high'
        
        # Check after-hours activity (burnout indicator)
        after_hours = slack.get('after_hours_messages', 0)
        if after_hours > 30:
            risk_score += 0.2
            risk_factors['burnout_risk'] = 'high'
        
        # Check meeting participation
        calendar = employee_data.get('calendar_metrics', {})
        if calendar.get('meetings_declined', 0) > 30:
            risk_score += 0.15
            risk_factors['disengagement'] = 'medium'
        
        # Check productivity
        productivity = employee_data.get('productivity_metrics', {})
        if productivity.get('performance_trend') == 'declining':
            risk_score += 0.15
            risk_factors['performance_decline'] = 'medium'
        
        risk_score = min(risk_score, 0.95)
        
        return risk_score, {
            'confidence': 0.65,  # Lower confidence for rule-based
            'risk_level': self._categorize_risk(risk_score),
            'risk_factors': risk_factors,
            'departure_window': self._estimate_departure_window(risk_score),
            'suggested_interventions': self._generate_interventions(risk_factors, risk_score)
        }
    
    def _categorize_risk(self, probability: float) -> str:
        """Categorize risk level based on probability"""
        if probability >= 0.75:
            return 'critical'
        elif probability >= 0.5:
            return 'high'
        elif probability >= 0.25:
            return 'medium'
        else:
            return 'low'
    
    def _identify_risk_factors(self, employee_data: Dict, features: np.ndarray) -> Dict:
        """Identify top risk factors from data"""
        risk_factors = {}
        
        # Communication factors
        slack = employee_data.get('slack_metrics', {})
        if slack.get('participation_trend') == 'declining':
            risk_factors['declining_communication'] = 'high'
        elif slack.get('message_count', 0) < 10:
            risk_factors['low_engagement'] = 'medium'
        
        # Sentiment analysis
        if slack.get('sentiment_score', 0) < -0.1:
            risk_factors['negative_sentiment'] = 'high'
        
        # Work-life balance
        if slack.get('after_hours_messages', 0) > 25:
            risk_factors['burnout_risk'] = 'high'
        
        # Meeting engagement
        calendar = employee_data.get('calendar_metrics', {})
        if calendar.get('meetings_declined', 0) > 20:
            risk_factors['meeting_avoidance'] = 'medium'
        
        # Performance
        productivity = employee_data.get('productivity_metrics', {})
        if productivity.get('performance_trend') == 'declining':
            risk_factors['performance_decline'] = 'high'
        
        # Workload
        if productivity.get('workload_balance', 0) < 0.3:
            risk_factors['workload_imbalance'] = 'high'
        
        return risk_factors
    
    def _estimate_departure_window(self, probability: float) -> str:
        """Estimate likely departure timeframe"""
        if probability >= 0.8:
            return "0-30 days"
        elif probability >= 0.6:
            return "30-60 days"
        elif probability >= 0.4:
            return "60-90 days"
        else:
            return "Low immediate risk"
    
    def _generate_interventions(self, risk_factors: Dict, probability: float) -> List[Dict]:
        """Generate recommended interventions based on risk factors"""
        interventions = []
        
        if 'declining_communication' in risk_factors:
            interventions.append({
                'action': 'Schedule 1:1 Check-in',
                'description': 'Have a direct conversation about engagement and any concerns',
                'priority': 'high',
                'timeline': 'within 3 days',
                'owner': 'Direct Manager'
            })
        
        if 'burnout_risk' in risk_factors:
            interventions.append({
                'action': 'Workload Review',
                'description': 'Review current workload and consider redistribution or support',
                'priority': 'high',
                'timeline': 'within 1 week',
                'owner': 'Manager + HR'
            })
            interventions.append({
                'action': 'Promote Work-Life Balance',
                'description': 'Encourage time off and establish after-hours boundaries',
                'priority': 'medium',
                'timeline': 'immediate',
                'owner': 'Manager'
            })
        
        if 'negative_sentiment' in risk_factors:
            interventions.append({
                'action': 'Employee Wellness Check',
                'description': 'HR to conduct confidential wellness conversation',
                'priority': 'high',
                'timeline': 'within 3 days',
                'owner': 'HR Partner'
            })
        
        if 'performance_decline' in risk_factors:
            interventions.append({
                'action': 'Performance Support Plan',
                'description': 'Identify skill gaps and provide training/mentoring',
                'priority': 'medium',
                'timeline': 'within 2 weeks',
                'owner': 'Manager'
            })
        
        if 'meeting_avoidance' in risk_factors:
            interventions.append({
                'action': 'Meeting Optimization',
                'description': 'Review meeting necessity and employee involvement',
                'priority': 'low',
                'timeline': 'within 2 weeks',
                'owner': 'Manager'
            })
        
        if probability > 0.7 and not interventions:
            interventions.append({
                'action': 'Retention Discussion',
                'description': 'Discuss career goals, compensation, and growth opportunities',
                'priority': 'critical',
                'timeline': 'immediately',
                'owner': 'Manager + HR'
            })
        
        return sorted(interventions, key=lambda x: 
                     {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}[x['priority']])
    
    def _calculate_confidence(self, features: np.ndarray) -> float:
        """Calculate prediction confidence based on feature completeness"""
        # Check how many features are non-zero (have data)
        data_completeness = np.sum(features != 0) / len(features)
        
        # Base confidence on data completeness
        confidence = 0.5 + (data_completeness * 0.45)
        
        return min(confidence, 0.95)
    
    def _create_demo_model(self):
        """Create a simple demo model for fallback"""
        # This is a placeholder - in production, you'd have a real model
        return None
    
    def _generate_synthetic_data(self, n_samples: int = 1000) -> pd.DataFrame:
        """Generate synthetic training data for demo purposes"""
        np.random.seed(42)
        
        data = []
        for i in range(n_samples):
            # Generate features
            tenure = np.random.uniform(0.5, 10)
            sentiment = np.random.uniform(-1, 1)
            engagement = np.random.uniform(0, 1)
            burnout = np.random.uniform(0, 1)
            performance = np.random.uniform(0, 1)
            
            # Create departure label based on features
            departure_probability = (
                (1 - tenure/10) * 0.3 +  # Newer employees more likely to leave
                (1 - sentiment) * 0.2 +   # Negative sentiment increases risk
                (1 - engagement) * 0.2 +  # Low engagement increases risk
                burnout * 0.2 +           # High burnout increases risk
                (1 - performance) * 0.1   # Low performance increases risk
            )
            
            departed = np.random.random() < departure_probability
            
            # Create full feature vector (matching FeatureExtractor output)
            features = np.random.randn(34)  # 34 features from FeatureExtractor
            features[0] = tenure
            features[6] = sentiment
            features[31] = engagement
            features[32] = burnout
            features[27] = performance
            
            row = {'employee_id': f'EMP{i:04d}', 'departed': int(departed)}
            for j, val in enumerate(features):
                row[f'feature_{j}'] = val
            
            data.append(row)
        
        return pd.DataFrame(data)
    
    def save_model(self):
        """Save model and scaler to disk"""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'timestamp': datetime.now().isoformat()
            }
            joblib.dump(model_data, self.model_path)
            logger.info(f"Model saved to {self.model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")
    
    def batch_predict(self, employees_data: List[Dict]) -> List[Tuple[float, Dict]]:
        """Predict for multiple employees"""
        predictions = []
        for employee_data in employees_data:
            prediction = self.predict(employee_data)
            predictions.append(prediction)
        return predictions