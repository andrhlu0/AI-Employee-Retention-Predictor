import React, { useState } from 'react';
import { 
  Bell, Shield, Users, Database, Link, 
  Save, AlertCircle, CheckCircle, Mail, 
  Calendar, Activity, CreditCard,
  ChevronRight
} from 'lucide-react';

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option>UTC</option>
                      <option>America/New_York</option>
                      <option>America/Los_Angeles</option>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Notifications
                    </label>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2"
                    />
                    <span>Enable email alerts for high-risk employees</span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alert Threshold
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option>70% Risk Score</option>
                      <option>75% Risk Score</option>
                      <option>80% Risk Score</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Save Notification Settings
                  </button>
                </div>
              )}
              
              {activeTab !== 'general' && activeTab !== 'notifications' && (
                <div className="text-center py-12">
                  <p className="text-gray-500">This section is coming soon!</p>
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