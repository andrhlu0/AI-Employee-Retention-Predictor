// frontend/src/pages/Settings.jsx
import React, { useState } from 'react';
import { 
  Bell, Shield, Users, Database, Link, 
  Save, AlertCircle, CheckCircle, Mail, 
  Calendar, Activity, CreditCard,
  ChevronRight
} from 'lucide-react';
import IntegrationsSettings from '../components/IntegrationsSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [saveStatus, setSaveStatus] = useState(null);
  
  const company = JSON.parse(localStorage.getItem('company') || '{}');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const tabs = [
    { id: 'general', name: 'General', icon: Activity },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'integrations', name: 'Integrations', icon: Link },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'billing', name: 'Billing & Plan', icon: CreditCard },
  ];

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="grid grid-cols-12 min-h-[600px]">
          {/* Sidebar */}
          <div className="col-span-3 border-r border-gray-200">
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.name}
                    {activeTab === tab.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Content */}
          <div className="col-span-9 p-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {tabs.find(t => t.id === activeTab)?.name} Settings
              </h2>
              
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue={company.name || 'Your Company'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>UTC</option>
                      <option>America/New_York</option>
                      <option>America/Los_Angeles</option>
                      <option>Europe/London</option>
                      <option>Europe/Paris</option>
                      <option>Asia/Tokyo</option>
                      <option>Asia/Shanghai</option>
                      <option>Australia/Sydney</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Risk Threshold
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>70% - Conservative</option>
                      <option>75% - Balanced</option>
                      <option>80% - Aggressive</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
              
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">High Risk Alerts</span>
                        <p className="text-xs text-gray-500">Get notified when employees reach high risk threshold</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Weekly Summary</span>
                        <p className="text-xs text-gray-500">Receive weekly retention analytics report</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Intervention Reminders</span>
                        <p className="text-xs text-gray-500">Get reminded about pending interventions</p>
                      </div>
                    </label>
                  </div>
                  
                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alert Threshold
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>70% Risk Score</option>
                      <option>75% Risk Score</option>
                      <option>80% Risk Score</option>
                      <option>85% Risk Score</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notification Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user.email || ''}
                      placeholder="notifications@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Save Notification Settings
                  </button>
                </div>
              )}
              
              {/* INTEGRATIONS TAB - This is where the IntegrationsSettings component is rendered */}
              {activeTab === 'integrations' && <IntegrationsSettings />}
              
              {activeTab === 'security' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Security Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Two-Factor Authentication
                        </label>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Add an extra layer of security to your account</span>
                          <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                            Enable 2FA
                          </button>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Session Timeout
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                          <option>30 minutes</option>
                          <option>1 hour</option>
                          <option>2 hours</option>
                          <option>4 hours</option>
                          <option>8 hours</option>
                        </select>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Access
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-white border rounded-md">
                            <div>
                              <p className="text-sm font-medium">API Key</p>
                              <p className="text-xs text-gray-500">Last used: Never</p>
                            </div>
                            <button className="px-3 py-1 text-sm text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50">
                              Generate Key
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Save Security Settings
                  </button>
                </div>
              )}
              
              {activeTab === 'billing' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Current Plan</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary-600">Professional</p>
                        <p className="text-sm text-gray-600 mt-1">$99/month • Up to 500 employees</p>
                      </div>
                      <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm text-gray-600">Employees Tracked</p>
                      <p className="text-2xl font-bold text-gray-900">156 / 500</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm text-gray-600">Predictions This Month</p>
                      <p className="text-2xl font-bold text-gray-900">1,248</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm text-gray-600">Next Billing Date</p>
                      <p className="text-2xl font-bold text-gray-900">Oct 1</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                          VISA
                        </div>
                        <span className="ml-3 text-sm text-gray-600">•••• 4242</span>
                      </div>
                      <button className="text-sm text-primary-600 hover:text-primary-700">
                        Update
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Billing History</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-600">September 1, 2024</span>
                        <span className="text-sm font-medium">$99.00</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-600">August 1, 2024</span>
                        <span className="text-sm font-medium">$99.00</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">July 1, 2024</span>
                        <span className="text-sm font-medium">$99.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Status Toast */}
      {saveStatus && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`flex items-center px-4 py-3 rounded-lg shadow-lg ${
            saveStatus === 'saved' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-900 text-white'
          }`}>
            {saveStatus === 'saving' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-3"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Settings saved!
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;