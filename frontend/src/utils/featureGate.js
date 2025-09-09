// frontend/src/utils/featureGate.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Feature Gate Utility
 * Controls access to features based on subscription plan
 */

// Plan hierarchy for comparison
const PLAN_HIERARCHY = {
  trial: 0,
  starter: 1,
  professional: 2,
  enterprise: 3
};

// Feature requirements mapping
const FEATURE_REQUIREMENTS = {
  // Basic features (available to all)
  basic_predictions: 'trial',
  email_export: 'trial',
  basic_dashboard: 'trial',
  
  // Starter features
  monthly_reports: 'starter',
  csv_export: 'starter',
  email_support: 'starter',
  
  // Professional features
  real_time_monitoring: 'professional',
  slack_integration: 'professional',
  teams_integration: 'professional',
  api_access: 'professional',
  custom_interventions: 'professional',
  hris_integration: 'professional',
  priority_support: 'professional',
  advanced_analytics: 'professional',
  excel_export: 'professional',
  pdf_export: 'professional',
  
  // Enterprise features
  unlimited_employees: 'enterprise',
  unlimited_api_calls: 'enterprise',
  dedicated_success_manager: 'enterprise',
  custom_ml_training: 'enterprise',
  white_label: 'enterprise',
  sla_guarantee: 'enterprise',
  custom_integrations: 'enterprise',
  advanced_security: 'enterprise'
};

// Plan limits
const PLAN_LIMITS = {
  trial: {
    max_employees: 50,
    max_predictions_per_month: null, // Unlimited during trial
    max_api_calls_per_month: 0,
    max_integrations: 0,
    data_retention_days: 30,
    max_file_upload_mb: 10
  },
  starter: {
    max_employees: 100,
    max_predictions_per_month: null,
    max_api_calls_per_month: 0,
    max_integrations: 0,
    data_retention_days: 90,
    max_file_upload_mb: 25
  },
  professional: {
    max_employees: 500,
    max_predictions_per_month: null,
    max_api_calls_per_month: 1000,
    max_integrations: 2,
    data_retention_days: 365,
    max_file_upload_mb: 100
  },
  enterprise: {
    max_employees: null, // Unlimited
    max_predictions_per_month: null,
    max_api_calls_per_month: null,
    max_integrations: null,
    data_retention_days: null,
    max_file_upload_mb: 500
  }
};

class FeatureGate {
  constructor() {
    this.currentPlan = null;
    this.usage = null;
    this.limits = null;
    this.features = null;
    this.initialized = false;
  }

  /**
   * Initialize feature gate with user's plan data
   */
  async initialize() {
    try {
      const response = await axios.get('/api/v1/billing/current-plan');
      this.currentPlan = response.data.plan_tier;
      this.features = response.data.features;
      this.limits = response.data.limits;
      
      // Fetch usage data
      const usageResponse = await axios.get('/api/v1/billing/usage');
      this.usage = usageResponse.data;
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize feature gate:', error);
      // Default to trial if API fails
      this.currentPlan = 'trial';
      this.features = PLAN_CONFIGS.trial.features;
      this.limits = PLAN_LIMITS.trial;
      this.initialized = true;
      return false;
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  hasFeature(featureName) {
    if (!this.initialized) {
      console.warn('FeatureGate not initialized. Call initialize() first.');
      return false;
    }

    // Check from server response first
    if (this.features && typeof this.features[featureName] !== 'undefined') {
      return this.features[featureName];
    }

    // Fallback to local check
    const requiredPlan = FEATURE_REQUIREMENTS[featureName];
    if (!requiredPlan) {
      // Unknown feature, default to enterprise only
      return this.currentPlan === 'enterprise';
    }

    const currentPlanLevel = PLAN_HIERARCHY[this.currentPlan] || 0;
    const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan] || 999;

    return currentPlanLevel >= requiredPlanLevel;
  }

  /**
   * Check if user is within a specific limit
   */
  isWithinLimit(limitType, currentValue = null) {
    if (!this.initialized) {
      console.warn('FeatureGate not initialized. Call initialize() first.');
      return false;
    }

    const limit = this.limits?.[limitType] ?? PLAN_LIMITS[this.currentPlan]?.[limitType];
    
    if (limit === null || limit === undefined) {
      // Unlimited
      return true;
    }

    // If currentValue not provided, try to get from usage
    if (currentValue === null) {
      switch (limitType) {
        case 'max_employees':
          currentValue = this.usage?.employees || 0;
          break;
        case 'max_api_calls_per_month':
          currentValue = this.usage?.api_calls || 0;
          break;
        default:
          currentValue = 0;
      }
    }

    return currentValue <= limit;
  }

  /**
   * Get the minimum plan required for a feature
   */
  getRequiredPlan(featureName) {
    return FEATURE_REQUIREMENTS[featureName] || 'enterprise';
  }

  /**
   * Get remaining capacity for a limit
   */
  getRemainingCapacity(limitType) {
    const limit = this.limits?.[limitType] ?? PLAN_LIMITS[this.currentPlan]?.[limitType];
    
    if (limit === null) {
      return Infinity;
    }

    let currentValue = 0;
    switch (limitType) {
      case 'max_employees':
        currentValue = this.usage?.employees || 0;
        break;
      case 'max_api_calls_per_month':
        currentValue = this.usage?.api_calls || 0;
        break;
      default:
        currentValue = 0;
    }

    return Math.max(0, limit - currentValue);
  }

  /**
   * Get usage percentage for a limit
   */
  getUsagePercentage(limitType) {
    const limit = this.limits?.[limitType] ?? PLAN_LIMITS[this.currentPlan]?.[limitType];
    
    if (limit === null || limit === 0) {
      return 0;
    }

    let currentValue = 0;
    switch (limitType) {
      case 'max_employees':
        currentValue = this.usage?.employees || 0;
        break;
      case 'max_api_calls_per_month':
        currentValue = this.usage?.api_calls || 0;
        break;
      default:
        currentValue = 0;
    }

    return Math.min(100, (currentValue / limit) * 100);
  }

  /**
   * Check if user should see upgrade prompt
   */
  shouldShowUpgradePrompt(limitType) {
    const percentage = this.getUsagePercentage(limitType);
    return percentage >= 80; // Show prompt at 80% usage
  }

  /**
   * Get all features for current plan
   */
  getCurrentPlanFeatures() {
    return this.features || {};
  }

  /**
   * Get all limits for current plan
   */
  getCurrentPlanLimits() {
    return this.limits || PLAN_LIMITS[this.currentPlan] || {};
  }

  /**
   * Check if user is on trial
   */
  isOnTrial() {
    return this.currentPlan === 'trial';
  }

  /**
   * Get plan upgrade path
   */
  getUpgradePath() {
    const currentLevel = PLAN_HIERARCHY[this.currentPlan] || 0;
    const plans = Object.keys(PLAN_HIERARCHY).filter(
      plan => PLAN_HIERARCHY[plan] > currentLevel
    );
    return plans.sort((a, b) => PLAN_HIERARCHY[a] - PLAN_HIERARCHY[b]);
  }
}

// Create singleton instance
const featureGate = new FeatureGate();

// React Hook for feature gating
export const useFeatureGate = () => {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('trial');
  const [usage, setUsage] = useState({});
  const [limits, setLimits] = useState({});

  useEffect(() => {
    const init = async () => {
      if (!featureGate.initialized) {
        await featureGate.initialize();
      }
      setCurrentPlan(featureGate.currentPlan);
      setUsage(featureGate.usage);
      setLimits(featureGate.limits);
      setInitialized(true);
      setLoading(false);
    };
    init();
  }, []);

  return {
    hasFeature: (feature) => featureGate.hasFeature(feature),
    isWithinLimit: (limit, value) => featureGate.isWithinLimit(limit, value),
    getRemainingCapacity: (limit) => featureGate.getRemainingCapacity(limit),
    getUsagePercentage: (limit) => featureGate.getUsagePercentage(limit),
    shouldShowUpgradePrompt: (limit) => featureGate.shouldShowUpgradePrompt(limit),
    getRequiredPlan: (feature) => featureGate.getRequiredPlan(feature),
    currentPlan,
    usage,
    limits,
    isOnTrial: () => featureGate.isOnTrial(),
    loading,
    initialized
  };
};

// HOC for protecting components with feature gates
export const withFeatureGate = (Component, requiredFeature, FallbackComponent = null) => {
  return (props) => {
    const { hasFeature, loading } = useFeatureGate();

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!hasFeature(requiredFeature)) {
      if (FallbackComponent) {
        return <FallbackComponent requiredFeature={requiredFeature} {...props} />;
      }
      return (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center mb-3">
            <svg className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">
              Feature Unavailable
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            This feature requires the {featureGate.getRequiredPlan(requiredFeature)} plan or higher.
          </p>
          <button 
            onClick={() => window.location.href = '/settings?tab=billing'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Plans & Upgrade
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Utility component for conditional rendering based on features
export const FeatureGated = ({ feature, children, fallback = null, showLock = true }) => {
  const { hasFeature, loading } = useFeatureGate();
  
  if (loading) {
    return null;
  }
  
  if (hasFeature(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showLock) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center rounded-lg">
          <div className="text-center p-4">
            <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-gray-600 font-medium">Upgrade to unlock</p>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

// Component for showing usage limit warnings
export const LimitWarning = ({ limitType, threshold = 80 }) => {
  const { getUsagePercentage, getRemainingCapacity, currentPlan } = useFeatureGate();
  const percentage = getUsagePercentage(limitType);
  const remaining = getRemainingCapacity(limitType);

  if (percentage < threshold) {
    return null;
  }

  const limitName = limitType.replace(/_/g, ' ').replace(/max /g, '');

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <svg className="h-5 w-5 text-amber-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <p className="text-amber-900 font-medium">
            Approaching {limitName} limit
          </p>
          <p className="text-amber-700 text-sm mt-1">
            You have {remaining === Infinity ? 'unlimited' : remaining} remaining on your {currentPlan} plan ({Math.round(percentage)}% used)
          </p>
          <button 
            onClick={() => window.location.href = '/settings?tab=billing'}
            className="mt-2 text-amber-700 font-medium text-sm hover:text-amber-800"
          >
            Upgrade Plan →
          </button>
        </div>
      </div>
    </div>
  );
};

// Component for showing feature upgrade prompt
export const FeatureUpgradePrompt = ({ feature, message }) => {
  const { hasFeature, getRequiredPlan } = useFeatureGate();
  
  if (hasFeature(feature)) {
    return null;
  }
  
  const requiredPlan = getRequiredPlan(feature);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <svg className="h-12 w-12 text-blue-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Unlock This Feature
      </h3>
      <p className="text-gray-600 mb-4">
        {message || `Upgrade to ${requiredPlan} plan to access this feature`}
      </p>
      <button 
        onClick={() => window.location.href = '/settings?tab=billing'}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        View Plans
      </button>
    </div>
  );
};

// Helper function to check multiple features at once
export const hasAllFeatures = (features) => {
  return features.every(feature => featureGate.hasFeature(feature));
};

export const hasAnyFeature = (features) => {
  return features.some(feature => featureGate.hasFeature(feature));
};

// Export the singleton instance for direct access if needed
export default featureGate;