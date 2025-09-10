import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Link, 
  Key,
  Globe,
  Mail,
  Palette,
  Database,
  Users as UsersIcon,
  Save,
  Lock,
  Smartphone,
  Activity,
  AlertCircle
} from 'lucide-react';
import BillingSettings from '../components/Settings/BillingSettings';
import IntegrationsSettings from '../components/IntegrationsSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [saveStatus, setSaveStatus] = useState(null);

  const tabs = [
    { id: 'general', name: 'General', icon: User },
    { id: 'billing', name: 'Billing & Plan', icon: CreditCard },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'integrations', name: 'Integrations', icon: Link },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'team', name: 'Team', icon: UsersIcon },
  ];

  const handleSave = (section) => {
    setSaveStatus('saving');
    // Simulate API call
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account and application preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">General Settings</h2>
                
                <div className="space-y-6">
                  {/* Profile Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          defaultValue="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          defaultValue="Doe"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          defaultValue="john.doe@company.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Language & Region */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Language & Region</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Globe className="inline w-4 h-4 mr-1" />
                          Language
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timezone
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                          <option>UTC-08:00 Pacific Time</option>
                          <option>UTC-05:00 Eastern Time</option>
                          <option>UTC+00:00 GMT</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('general')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Settings */}
            {activeTab === 'billing' && <BillingSettings />}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <Mail className="inline w-5 h-5 mr-2" />
                      Email Notifications
                    </h3>
                    <div className="space-y-3">
                      {[
                        { id: 'risk-alerts', label: 'High Risk Employee Alerts', description: 'Get notified when an employee enters high risk category' },
                        { id: 'weekly-digest', label: 'Weekly Digest', description: 'Summary of retention metrics and trends' },
                        { id: 'interventions', label: 'Intervention Reminders', description: 'Reminders for scheduled intervention actions' },
                        { id: 'system-updates', label: 'System Updates', description: 'Important updates and new features' }
                      ].map((item) => (
                        <div key={item.id} className="flex items-start">
                          <input
                            type="checkbox"
                            id={item.id}
                            defaultChecked
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={item.id} className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Push Notifications */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <Smartphone className="inline w-5 h-5 mr-2" />
                      Push Notifications
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Enable Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive alerts on your mobile device</p>
                      </div>
                      <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                        <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleSave('notifications')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Settings - Now using the IntegrationsSettings component */}
            {activeTab === 'integrations' && (
              <IntegrationsSettings />
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-6">
                  {/* Password */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <Lock className="inline w-5 h-5 mr-2" />
                      Password
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Password</p>
                          <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                        </div>
                        <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
                          Change Password
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <Shield className="inline w-5 h-5 mr-2" />
                      Two-Factor Authentication
                    </h3>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-yellow-800">
                            Two-factor authentication is not enabled
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Enable 2FA to add an extra layer of security to your account
                          </p>
                        </div>
                        <button className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                          Enable 2FA
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* API Keys */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <Key className="inline w-5 h-5 mr-2" />
                      API Keys
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Used
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Production API
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Jan 15, 2024
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              2 hours ago
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-red-600 hover:text-red-900">Revoke</button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Generate New API Key
                    </button>
                  </div>

                  {/* Active Sessions */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <Activity className="inline w-5 h-5 mr-2" />
                      Active Sessions
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Current Session</p>
                            <p className="text-sm text-gray-500">Chrome on MacOS • San Francisco, CA</p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                            Active Now
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Settings */}
            {activeTab === 'team' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Team Management</h2>
                
                <div className="space-y-6">
                  {/* Team Members */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Invite Member
                      </button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Member
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                  JD
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">John Doe</div>
                                  <div className="text-sm text-gray-500">john.doe@company.com</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                Admin
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-gray-600 hover:text-gray-900">Edit</button>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                                  JS
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">Jane Smith</div>
                                  <div className="text-sm text-gray-500">jane.smith@company.com</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Manager
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-gray-600 hover:text-gray-900">Edit</button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pending Invitations */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Invitations</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">mike.wilson@company.com</p>
                          <p className="text-sm text-gray-500">Invited 3 days ago • Viewer role</p>
                        </div>
                        <button className="text-red-600 hover:text-red-900 text-sm">
                          Revoke Invitation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Status Toast */}
        {saveStatus === 'saved' && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Settings saved successfully
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;