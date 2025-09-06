import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, Users, Link, Settings, ArrowRight } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: 'Welcome to RetentionAI',
      icon: CheckCircle,
      content: 'WelcomeStep'
    },
    {
      title: 'Upload Employee Data',
      icon: Upload,
      content: 'UploadStep'
    },
    {
      title: 'Connect Integrations',
      icon: Link,
      content: 'IntegrationsStep'
    },
    {
      title: 'Configure Settings',
      icon: Settings,
      content: 'SettingsStep'
    }
  ];
  
  const WelcomeStep = () => (
    <div className="text-center py-12">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-4">Welcome to RetentionAI!</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Let's get you set up in just a few minutes. We'll help you import your employee data 
        and configure your retention prediction system.
      </p>
      <button
        onClick={() => setCurrentStep(1)}
        className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        Get Started <ArrowRight className="inline w-4 h-4 ml-2" />
      </button>
    </div>
  );
  
  const UploadStep = () => (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4">Upload Employee Data</h2>
      <p className="text-gray-600 mb-6">
        Import your employee list to start analyzing retention risks
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button className="p-6 border-2 border-dashed rounded-lg hover:border-primary-500">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="font-medium">Upload CSV</p>
          <p className="text-sm text-gray-500 mt-1">Import from spreadsheet</p>
        </button>
        
        <button className="p-6 border-2 border-dashed rounded-lg hover:border-primary-500">
          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="font-medium">Connect HRIS</p>
          <p className="text-sm text-gray-500 mt-1">Sync from HR system</p>
        </button>
        
        <button className="p-6 border-2 border-dashed rounded-lg hover:border-primary-500">
          <Settings className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="font-medium">Manual Entry</p>
          <p className="text-sm text-gray-500 mt-1">Add employees manually</p>
        </button>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(0)}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep(2)}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
  
  const IntegrationsStep = () => (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4">Connect Your Tools</h2>
      <p className="text-gray-600 mb-6">
        Connect your communication and productivity tools for better predictions
      </p>
      
      <div className="space-y-4 mb-8">
        <div className="p-4 border rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <img src="/slack-logo.png" alt="Slack" className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium">Slack</p>
              <p className="text-sm text-gray-500">Analyze communication patterns</p>
            </div>
          </div>
          <button className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50">
            Connect
          </button>
        </div>
        
        <div className="p-4 border rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <img src="/google-logo.png" alt="Google" className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium">Google Workspace</p>
              <p className="text-sm text-gray-500">Email and calendar insights</p>
            </div>
          </div>
          <button className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50">
            Connect
          </button>
        </div>
        
        <div className="p-4 border rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <img src="/microsoft-logo.png" alt="Microsoft" className="w-8 h-8 mr-3" />
            <div>
              <p className="font-medium">Microsoft 365</p>
              <p className="text-sm text-gray-500">Teams and Outlook data</p>
            </div>
          </div>
          <button className="px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50">
            Connect
          </button>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
  
  const SettingsStep = () => (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4">Configure Settings</h2>
      <p className="text-gray-600 mb-6">
        Customize how RetentionAI works for your company
      </p>
      
      <div className="space-y-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            High Risk Threshold
          </label>
          <select className="w-full px-3 py-2 border rounded-md">
            <option>70% - Conservative</option>
            <option selected>75% - Balanced</option>
            <option>80% - Aggressive</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alert Frequency
          </label>
          <select className="w-full px-3 py-2 border rounded-md">
            <option>Real-time</option>
            <option selected>Daily</option>
            <option>Weekly</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Notifications To
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="hr@company.com"
          />
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          Back
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
  
  const StepContent = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep />;
      case 1: return <UploadStep />;
      case 2: return <IntegrationsStep />;
      case 3: return <SettingsStep />;
      default: return <WelcomeStep />;
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex-1 text-center ${
                  index <= currentStep ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  {index > 0 && (
                    <div
                      className={`absolute top-5 w-full h-0.5 -left-1/2 ${
                        index <= currentStep ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                  <div
                    className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                      index <= currentStep
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className="mt-2 text-xs font-medium">{step.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Step Content */}
        <StepContent />
      </div>
    </div>
  );
};

export default Onboarding;