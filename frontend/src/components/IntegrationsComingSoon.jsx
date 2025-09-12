import React, { useState } from 'react';
import { 
  Brain, Link2, Building2, Shield, ArrowRight, Info,
  Slack, Calendar, Mail, Users, Database, Clock,
  ChevronRight, Star, Lock
} from 'lucide-react';

const IntegrationsComingSoon = () => {
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const integrations = [
    {
      category: "HRIS Systems",
      icon: Building2,
      color: "blue",
      systems: [
        {
          id: "bamboohr",
          name: "BambooHR",
          description: "Sync employee data and organizational structure",
          comingSoon: "Q1 2025",
          features: ["Auto-sync employee data", "Department mapping", "Real-time updates"]
        },
        {
          id: "workday",
          name: "Workday",
          description: "Enterprise-grade HR data integration",
          comingSoon: "Q1 2025",
          features: ["Custom field mapping", "Scheduled syncs", "Audit logs"]
        },
        {
          id: "adp",
          name: "ADP Workforce Now",
          description: "Comprehensive payroll and HR data sync",
          comingSoon: "Q2 2025",
          features: ["Payroll insights", "Time tracking", "Benefits data"]
        },
        {
          id: "successfactors",
          name: "SAP SuccessFactors",
          description: "Performance and talent management integration",
          comingSoon: "Q2 2025",
          features: ["Performance reviews", "Goal tracking", "Learning data"]
        }
      ]
    },
    {
      category: "Communication Tools",
      icon: Mail,
      color: "purple",
      systems: [
        {
          id: "slack",
          name: "Slack",
          description: "Real-time alerts and team collaboration",
          comingSoon: "Q1 2025",
          features: ["Risk alerts", "Weekly summaries", "Interactive dashboards"]
        },
        {
          id: "teams",
          name: "Microsoft Teams",
          description: "Integrated notifications and reporting",
          comingSoon: "Q1 2025",
          features: ["Channel notifications", "Personal insights", "Team analytics"]
        },
        {
          id: "gmail",
          name: "Gmail & Google Workspace",
          description: "Email activity analysis and calendar insights",
          comingSoon: "Q2 2025",
          features: ["Sentiment analysis", "Meeting patterns", "Communication frequency"]
        }
      ]
    },
    {
      category: "AI & Analytics",
      icon: Brain,
      color: "green",
      systems: [
        {
          id: "openai",
          name: "OpenAI GPT-4",
          description: "Advanced language model for communication analysis",
          comingSoon: "Available Now",
          available: true,
          features: ["Sentiment scoring", "Context analysis", "Predictive insights"]
        },
        {
          id: "anthropic",
          name: "Anthropic Claude",
          description: "Safe AI for sensitive HR data analysis",
          comingSoon: "Q1 2025",
          features: ["Privacy-focused", "Ethical AI", "Explainable predictions"]
        }
      ]
    }
  ];

  const handleNotifyMe = () => {
    if (email) {
      setSubscribed(true);
      // In production, this would send to your backend
      console.log('Subscribing email:', email);
      setTimeout(() => {
        setEmail('');
        setTimeout(() => setSubscribed(false), 3000);
      }, 1000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Integrations Hub
            </h2>
            <p className="text-gray-600">
              Connect your favorite tools to supercharge retention insights
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Coming Soon</span>
          </div>
        </div>

        {/* Notification Signup */}
        <div className="mt-6 bg-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                Be the first to know when integrations launch
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {!subscribed ? (
                <>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleNotifyMe}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Notify Me
                  </button>
                </>
              ) : (
                <div className="flex items-center text-green-600">
                  <Star className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">You're on the list!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Integration Categories */}
      <div className="space-y-8">
        {integrations.map((category) => {
          const IconComponent = category.icon;
          return (
            <div key={category.category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className={`bg-gradient-to-r from-${category.color}-50 to-${category.color}-100 px-6 py-4 border-b border-gray-200`}>
                <div className="flex items-center">
                  <IconComponent className={`w-6 h-6 text-${category.color}-600 mr-3`} />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {category.category}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.systems.map((system) => (
                    <div
                      key={system.id}
                      className={`relative border rounded-lg p-4 transition-all cursor-pointer ${
                        system.available 
                          ? 'border-green-300 bg-green-50 hover:shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedIntegration(system)}
                    >
                      {system.available && (
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                            Available
                          </span>
                        </div>
                      )}
                      
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {system.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {system.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${
                          system.available ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {system.comingSoon}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>

                      {!system.available && (
                        <div className="absolute inset-0 bg-gray-100 bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Lock className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Integration Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedIntegration.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedIntegration.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Key Features
                </h4>
                <ul className="space-y-2">
                  {selectedIntegration.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Expected Launch:
                  </span>
                  <span className={`text-sm font-semibold ${
                    selectedIntegration.available ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {selectedIntegration.comingSoon}
                  </span>
                </div>
              </div>

              {selectedIntegration.available ? (
                <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Configure Now
                </button>
              ) : (
                <button
                  onClick={handleNotifyMe}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Get Notified When Available
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Why Integrate?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4">
            <Database className="w-8 h-8 text-indigo-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">
              Unified Data
            </h4>
            <p className="text-sm text-gray-600">
              Combine data from multiple sources for comprehensive insights
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <Clock className="w-8 h-8 text-purple-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">
              Real-Time Sync
            </h4>
            <p className="text-sm text-gray-600">
              Keep your data up-to-date with automatic synchronization
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <Shield className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">
              Secure & Compliant
            </h4>
            <p className="text-sm text-gray-600">
              Enterprise-grade security with SOC 2 compliance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsComingSoon;