import pandas as pd
import numpy as np
from sklearn.metrics import (
    roc_auc_score, precision_recall_curve, average_precision_score,
    confusion_matrix, classification_report, roc_curve
)
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Tuple, Dict, List
import pickle
import logging

logger = logging.getLogger(__name__)

class ModelEvaluator:
    def __init__(self, model_path: str):
        self.model = None
        self.scaler = None
        self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load saved model"""
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
    
    def evaluate_on_test_set(self, X_test: pd.DataFrame, y_test: pd.Series) -> Dict:
        """Comprehensive model evaluation"""
        # Scale features
        X_test_scaled = self.scaler.transform(X_test)
        
        # Get predictions
        y_pred = self.model.predict(X_test_scaled)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        
        # Calculate metrics
        metrics = {
            'roc_auc': roc_auc_score(y_test, y_pred_proba),
            'avg_precision': average_precision_score(y_test, y_pred_proba),
            'confusion_matrix': confusion_matrix(y_test, y_pred),
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }
        
        # Log results
        logger.info(f"ROC-AUC Score: {metrics['roc_auc']:.3f}")
        logger.info(f"Average Precision: {metrics['avg_precision']:.3f}")
        logger.info("\nConfusion Matrix:")
        logger.info(metrics['confusion_matrix'])
        
        return metrics
    
    def plot_evaluation_curves(self, X_test: pd.DataFrame, y_test: pd.Series, 
                              save_path: str = 'evaluation_plots.png'):
        """Plot ROC and Precision-Recall curves"""
        X_test_scaled = self.scaler.transform(X_test)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        
        # ROC Curve
        fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        
        axes[0].plot(fpr, tpr, color='darkorange', lw=2, 
                    label=f'ROC curve (AUC = {roc_auc:.2f})')
        axes[0].plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
        axes[0].set_xlim([0.0, 1.0])
        axes[0].set_ylim([0.0, 1.05])
        axes[0].set_xlabel('False Positive Rate')
        axes[0].set_ylabel('True Positive Rate')
        axes[0].set_title('ROC Curve')
        axes[0].legend(loc="lower right")
        
        # Precision-Recall Curve
        precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
        avg_precision = average_precision_score(y_test, y_pred_proba)
        
        axes[1].plot(recall, precision, color='darkorange', lw=2,
                    label=f'Precision-Recall curve (AP = {avg_precision:.2f})')
        axes[1].set_xlim([0.0, 1.0])
        axes[1].set_ylim([0.0, 1.05])
        axes[1].set_xlabel('Recall')
        axes[1].set_ylabel('Precision')
        axes[1].set_title('Precision-Recall Curve')
        axes[1].legend(loc="lower left")
        
        plt.tight_layout()
        plt.savefig(save_path)
        plt.show()
        
        logger.info(f"Evaluation plots saved to {save_path}")
    
    def analyze_feature_importance(self, feature_names: List[str], 
                                  top_n: int = 15) -> pd.DataFrame:
        """Analyze and visualize feature importance"""
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            
            # Create dataframe
            importance_df = pd.DataFrame({
                'feature': feature_names,
                'importance': importances
            }).sort_values('importance', ascending=False)
            
            # Plot
            plt.figure(figsize=(10, 8))
            sns.barplot(data=importance_df.head(top_n), 
                       x='importance', y='feature', palette='viridis')
            plt.title(f'Top {top_n} Most Important Features')
            plt.xlabel('Importance Score')
            plt.tight_layout()
            plt.show()
            
            return importance_df
        else:
            logger.warning("Model doesn't have feature_importances_ attribute")
            return pd.DataFrame()
    
    def calculate_optimal_threshold(self, X_val: pd.DataFrame, y_val: pd.Series) -> float:
        """Calculate optimal classification threshold"""
        X_val_scaled = self.scaler.transform(X_val)
        y_pred_proba = self.model.predict_proba(X_val_scaled)[:, 1]
        
        precision, recall, thresholds = precision_recall_curve(y_val, y_pred_proba)
        
        # Find threshold that maximizes F1 score
        f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
        optimal_idx = np.argmax(f1_scores[:-1])
        optimal_threshold = thresholds[optimal_idx]
        
        logger.info(f"Optimal threshold: {optimal_threshold:.3f}")
        logger.info(f"F1 score at optimal threshold: {f1_scores[optimal_idx]:.3f}")
        
        return optimal_threshold