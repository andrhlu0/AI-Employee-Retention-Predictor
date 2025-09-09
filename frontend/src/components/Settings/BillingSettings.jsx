// frontend/src/components/Settings/BillingSettings.jsx
import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Check, 
  X, 
  Zap, 
  Users, 
  BarChart3, 
  Slack, 
  Mail, 
  Clock, 
  Shield, 
  Sparkles,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Download,
  Calendar
} from 'lucide-react';

const BillingSettings = () => {
  const [currentPlan, setCurrentPlan] = useState('trial');
  const [trialDaysLeft, setTrialDaysLeft] = useState(14);
  const [employeeCount, setEmployeeCount] = useState(45);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [usage, setUsage] = useState({
    employees: 45,
    predictions: 1250,
    apiCalls: 0,
    storageGB: 2.3
  });

  // Plan definitions with all features
  const plans = {
    trial: {
      name: 'Free Trial',
      price: 0,
      period: '14 days',
      color: 'amber',
      badge: 'Current Plan',
      limits: {
        employees: 50,
        predictions: 'Unlimited during trial',
        support: 'Email',
        integrations: 'Basic',
        apiAccess: false
      }
    },
    starter: {
      name: 'Starter',
      price: billingCycle === 'monthly' ? 299 : 269,
      period: billingCycle === 'monthly' ? '/month' : '/month (billed annually)',
      color: 'blue',
      badge: null,
      limits: {
        employees: 100,
        predictions: 'Unlimited',
        support: 'Email',
        integrations: 'Basic',
        apiAccess: false
      },
      features: [
        { name: 'Up to 100 employees', included: true },
        { name: 'AI-powered predictions', included: true },
        { name: 'Monthly risk reports', included: true },
        { name: 'Email support', included: true },
        { name: 'Data export (CSV)', included: true },
        { name: 'Basic analytics dashboard', included: true },
        { name: 'Slack/Teams integration', included: false },
        { name: 'API access', included: false },
        { name: 'Custom interventions', included: false },
        { name: 'Priority support', included: false },
        { name: 'HRIS integrations', included: false },
        { name: 'Dedicated success manager', included: false }
      ]
    },
    professional: {
      name: 'Professional',
      price: billingCycle === 'monthly' ? 799 : 719,
      period: billingCycle === 'monthly' ? '/month' : '/month (billed annually)',
      color: 'purple',
      badge: 'Most Popular',
      limits: {
        employees: 500,
        predictions: 'Unlimited',
        support: 'Priority',
        integrations: 'Advanced',
        apiAccess: false
      },
      features: [
        { name: 'Up to 500 employees', included: true },
        { name: 'AI-powered predictions', included: true },
        { name: 'Real-time risk monitoring', included: true },
        { name: 'Priority support', included: true },
        { name: 'Data export (CSV, Excel, PDF)', included: true },
        { name: 'Advanced analytics dashboard', included: true },
        { name: 'Slack/Teams integration', included: true },
        { name: 'API access (1000 calls/month)', included: true },
        { name: 'Custom interventions', included: true },
        { name: 'HRIS integrations (2)', included: true },
        { name: 'Custom reports', included: true },
        { name: 'Dedicated success manager', included: false }
      ]
    },
    enterprise: {
      name: 'Enterprise',
      price: 2499,
      period: '+/month',
      color: 'emerald',
      badge: 'Full Features',
      limits: {
        employees: 'Unlimited',
        predictions: 'Unlimited',
        support: 'Dedicated',
        integrations: 'Unlimited',
        apiAccess: true
      },
      features: [
        { name: 'Unlimited employees', included: true },
        { name: 'AI-powered predictions', included: true },
        { name: 'Real-time risk monitoring', included: true },
        { name: 'Dedicated success manager', included: true },
        { name: 'Data export (All formats)', included: true },
        { name: 'Custom analytics dashboard', included: true },
        { name: 'All communication integrations', included: true },
        { name: 'Unlimited API access', included: true },
        { name: 'Custom ML model training', included: true },
        { name: 'Unlimited HRIS integrations', included: true },
        { name: 'White-label options', included: true },
        { name: 'SLA guarantee (99.9%)', included: true }
      ]
    }
  };

  const handleUpgrade = (planKey) => {
    setSelectedPlan(planKey);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = () => {
    setCurrentPlan(selectedPlan);
    setShowUpgradeModal(false);
    setTrialDaysLeft(0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Billing & Plan</h2>
      
      {/* Current Plan Status */}
      {currentPlan === 'trial' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
              <span className="text-amber-900 font-medium">
                Free trial ends in {trialDaysLeft} days
              </span>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Usage Overview */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Employees</span>
              <span className="text-sm font-medium">{usage.employees} / {plans[currentPlan].limits.employees}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(usage.employees / (typeof plans[currentPlan].limits.employees === 'number' ? plans[currentPlan].limits.employees : 1000)) * 100}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Predictions</span>
              <span className="text-sm font-medium">{formatNumber(usage.predictions)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">API Calls</span>
              <span className="text-sm font-medium">{usage.apiCalls} / {currentPlan === 'professional' ? '1000' : currentPlan === 'enterprise' ? '∞' : '0'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="text-sm font-medium">{usage.storageGB} GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-amber-600 h-2 rounded-full" style={{ width: '23%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingCycle === 'monthly' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md transition-colors ${
              billingCycle === 'annual' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Annual billing
            <span className="ml-2 text-green-600 text-sm font-medium">Save 10%</span>
          </button>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(plans).filter(([key]) => key !== 'trial').map(([planKey, plan]) => (
          <div
            key={planKey}
            className={`bg-white rounded-lg shadow-sm border-2 ${
              currentPlan === planKey ? 'border-blue-500' : 'border-gray-200'
            } relative overflow-hidden`}
          >
            {plan.badge && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
                {plan.badge}
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-600 ml-2">{plan.period}</span>
              </div>

              {currentPlan === planKey ? (
                <button className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg font-medium cursor-not-allowed">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(planKey)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {currentPlan === 'trial' || 
                   (currentPlan === 'starter' && planKey !== 'starter') ||
                   (currentPlan === 'professional' && planKey === 'enterprise') 
                    ? 'Upgrade' : 'Change Plan'}
                </button>
              )}

              <div className="mt-6 space-y-3">
                {plan.features?.slice(0, 6).map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Billing History */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
          <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Download All
          </button>
        </div>
        
        <div className="space-y-3">
          {currentPlan !== 'trial' ? (
            <>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">November 2024</p>
                  <p className="text-xs text-gray-500">Professional Plan</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">$799.00</p>
                  <button className="text-xs text-blue-600 hover:text-blue-700">Download</button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No billing history yet. Upgrade to a paid plan to see invoices here.
            </p>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {selectedPlan ? `Upgrade to ${plans[selectedPlan].name}` : 'Choose a Plan'}
            </h3>
            
            {selectedPlan ? (
              <div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-baseline mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      ${plans[selectedPlan].price}
                    </span>
                    <span className="text-gray-600 ml-2">{plans[selectedPlan].period}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your card will be charged today. You can cancel anytime.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUpgrade}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Confirm Upgrade
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(plans).filter(([key]) => key !== 'trial' && key !== currentPlan).map(([planKey, plan]) => (
                  <button
                    key={planKey}
                    onClick={() => setSelectedPlan(planKey)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{plan.name}</h4>
                        <p className="text-sm text-gray-600">
                          ${plan.price}{plan.period}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSettings;