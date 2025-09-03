import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, precision_recall_curve, classification_report
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
import pickle
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RetentionModelTrainer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.best_model = None
        self.best_score = 0
        
    def load_training_data(self, filepath: str) -> pd.DataFrame:
        """Load and prepare training data"""
        # In production, this would load from your data warehouse
        # For demo, creating synthetic data
        return self._create_synthetic_data()
    
    def _create_synthetic_data(self) -> pd.DataFrame:
        """Create synthetic training data for demo"""
        np.random.seed(42)
        n_samples = 10000
        
        # Generate features
        data = {
            'tenure_years': np.random.uniform(0.5, 10, n_samples),
            'department': np.random.choice([0.1, 0.2, 0.3, 0.4, 0.5], n_samples),
            'position_level': np.random.uniform(0.3, 0.9, n_samples),
            'slack_messages': np.random.uniform(0, 5, n_samples),
            'slack_response_time': np.random.uniform(0, 2, n_samples),
            'slack_channels': np.random.uniform(0, 1, n_samples),
            'slack_sentiment': np.random.uniform(-0.5, 1, n_samples),
            'slack_after_hours': np.random.uniform(0, 0.5, n_samples),
            'slack_trend': np.random.choice([-1, 0, 1], n_samples),
            'email_sent': np.random.uniform(0, 3, n_samples),
            'email_received': np.random.uniform(0, 3, n_samples),
            'email_response_time': np.random.uniform(0, 2, n_samples),
            'email_unread': np.random.uniform(0, 0.3, n_samples),
            'email_after_hours': np.random.uniform(0, 0.4, n_samples),
            'email_sentiment': np.random.uniform(-0.5, 1, n_samples),
            'email_external': np.random.uniform(0, 0.5, n_samples),
            'meeting_hours': np.random.uniform(0, 1.5, n_samples),
            'meetings_declined': np.random.uniform(0, 0.4, n_samples),
            'one_on_ones': np.random.uniform(0, 1, n_samples),
            'recurring_dropped': np.random.uniform(0, 3, n_samples),
            'meeting_participation': np.random.uniform(0.3, 1, n_samples),
            'calendar_fragmentation': np.random.uniform(0, 1, n_samples),
            'pto_days': np.random.uniform(0, 1, n_samples),
            'task_completion': np.random.uniform(0.5, 1, n_samples),
            'project_involvement': np.random.uniform(0, 1, n_samples),
            'code_commits': np.random.uniform(0, 1, n_samples),
            'ticket_resolution': np.random.uniform(0, 2, n_samples),
            'performance_trend': np.random.choice([-1, 0, 1], n_samples),
            'skill_utilization': np.random.uniform(0.3, 1, n_samples),
            'workload_balance': np.random.uniform(0.2, 1, n_samples),
            'comm_balance': np.random.uniform(0, 1, n_samples),
            'engagement': np.random.uniform(0, 1, n_samples),
            'burnout_risk': np.random.uniform(0, 1, n_samples),
            'isolation': np.random.uniform(0, 1, n_samples)
        }
        
        df = pd.DataFrame(data)
        
        # Create target variable based on risk factors
        risk_score = (
            (df['slack_sentiment'] < 0.3) * 0.2 +
            (df['slack_trend'] == -1) * 0.15 +
            (df['burnout_risk'] > 0.7) * 0.2 +
            (df['meetings_declined'] > 0.3) * 0.1 +
            (df['one_on_ones'] < 0.3) * 0.1 +
            (df['task_completion'] < 0.7) * 0.15 +
            (df['isolation'] > 0.7) * 0.1 +
            np.random.uniform(-0.1, 0.1, n_samples)  # Add noise
        )
        
        df['will_leave'] = (risk_score > 0.5).astype(int)
        
        return df
    
    def train_models(self, df: pd.DataFrame):
        """Train multiple models and select best"""
        # Prepare data
        X = df.drop('will_leave', axis=1)
        y = df['will_leave']
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train different models
        models = {
            'xgboost': xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                objective='binary:logistic',
                random_state=42
            ),
            'random_forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            ),
            'gradient_boosting': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=5,
                random_state=42
            )
        }
        
        for name, model in models.items():
            logger.info(f"Training {name}...")
            
            # Train
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
            auc_score = roc_auc_score(y_test, y_pred_proba)
            
            # Cross-validation
            cv_scores = cross_val_score(
                model, X_train_scaled, y_train, 
                cv=5, scoring='roc_auc'
            )
            
            logger.info(f"{name} - AUC: {auc_score:.3f}, CV Mean: {cv_scores.mean():.3f}")
            
            # Select best model
            if auc_score > self.best_score:
                self.best_score = auc_score
                self.best_model = model
                self.model = model
        
        # Print detailed evaluation for best model
        self._evaluate_model(X_test_scaled, y_test)
    
    def _evaluate_model(self, X_test, y_test):
        """Detailed model evaluation"""
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        logger.info("\n" + "="*50)
        logger.info("BEST MODEL EVALUATION")
        logger.info("="*50)
        logger.info(f"Model Type: {type(self.model).__name__}")
        logger.info(f"ROC-AUC Score: {self.best_score:.3f}")
        logger.info("\nClassification Report:")
        logger.info(classification_report(y_test, y_pred))
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
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
            
            importances = pd.DataFrame({
                'feature': feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            logger.info("\nTop 10 Most Important Features:")
            for idx, row in importances.head(10).iterrows():
                logger.info(f"{row['feature']}: {row['importance']:.3f}")
    
    def save_model(self, filepath: str = 'models/retention_model.pkl'):
        """Save trained model and scaler"""
        Path(filepath).parent.mkdir(exist_ok=True)
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'score': self.best_score
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Model saved to {filepath}")

if __name__ == "__main__":
    trainer = RetentionModelTrainer()
    
    # Load/create training data
    logger.info("Loading training data...")
    df = trainer.load_training_data("data/training_data.csv")
    
    # Train models
    logger.info("Training models...")
    trainer.train_models(df)
    
    # Save best model
    trainer.save_model()
    
    logger.info("Training completed successfully!")