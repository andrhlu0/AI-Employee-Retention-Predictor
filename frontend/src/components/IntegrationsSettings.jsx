import React, { useState, useEffect } from 'react';
import { 
  Brain, Link2, CheckCircle, Loader, AlertCircle, X,
  Building2, Key, Database, Shield, ArrowRight, Info
} from 'lucide-react';

// Default HRIS systems to show if API fails
const DEFAULT_HRIS_SYSTEMS = [
  {
    id: "bamboohr",
    name: "BambooHR",
    description: "Modern HR software with a focus on user experience",
    required_fields: {
      api_key: "API Key",
      subdomain: "Company Subdomain"
    },
    documentation_url: "https://documentation.bamboohr.com/reference",
    setup_time: "5 minutes"
  },
  {
    id: "workday",
    name: "Workday",
    description: "Enterprise cloud applications for HR and finance",
    required_fields: {
      username: "Username",
      password: "Password",
      tenant: "Tenant ID"
    },
    optional_fields: {
      endpoint: "Custom Endpoint URL"
    },
    documentation_url: "https://community.workday.com/api",
    setup_time: "15 minutes"
  },
  {
    id: "adp",
    name: "ADP Workforce Now",
    description: "Comprehensive HR management for mid-sized companies",
    required_fields: {
      client_id: "Client ID",
      client_secret: "Client Secret",
      org_code: "Organization Code"
    },
    documentation_url: "https://developers.adp.com",
    setup_time: "10 minutes"
  },
  {
    id: "successfactors",
    name: "SAP SuccessFactors",
    description: "Cloud-based HR solution suite",
    required_fields: {
      company_id: "Company ID",
      username: "Username",
      password: "Password"
    },
    optional_fields: {
      api_endpoint: "API Endpoint"
    },
    documentation_url: "https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM",
    setup_time: "20 minutes"
  }
];

const DEFAULT_AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI GPT-4",
    description: "Advanced language model for analyzing communication patterns",
    features: ["Email sentiment analysis", "Meeting transcript analysis", "Chat message scoring"],
    setup_time: "2 minutes"
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "Constitutional AI for safe and helpful analysis",
    features: ["Context-aware scoring", "Nuanced communication analysis", "Privacy-focused"],
    setup_time: "2 minutes"
  }
];

const IntegrationsSettings = () => {
  const [loading, setLoading] = useState({});
  const [integrations, setIntegrations] = useState({
    bamboohr: { connected: false, lastSync: null },
    workday: { connected: false, lastSync: null },
    adp: { connected: false, lastSync: null },
    successfactors: { connected: false, lastSync: null },
    ai_scoring: { enabled: false, provider: null }
  });
  
  const [showModal, setShowModal] = useState(false);
  const [currentSystem, setCurrentSystem] = useState(null);
  const [credentials, setCredentials] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [availableSystems, setAvailableSystems] = useState({ 
    hris_systems: DEFAULT_HRIS_SYSTEMS, 
    ai_providers: DEFAULT_AI_PROVIDERS 
  });

  useEffect(() => {
    fetchIntegrationStatus();
    fetchAvailableSystems();
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      // Fetch HRIS status
      const hrisResponse = await fetch('/api/integrations/hris/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (hrisResponse.ok) {
        const hrisData = await hrisResponse.json();
        const hrisStatus = {};
        hrisData.forEach(system => {
          hrisStatus[system.system] = {
            connected: system.connected,
            lastSync: system.last_sync,
            employeeCount: system.employee_count,
            error: system.error
          };
        });
        setIntegrations(prev => ({ ...prev, ...hrisStatus }));
      }

      // Fetch AI scoring status
      const aiResponse = await fetch('/api/integrations/ai-scoring/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        setIntegrations(prev => ({
          ...prev,
          ai_scoring: {
            enabled: aiData.enabled,
            provider: aiData.provider,
            configured_at: aiData.configured_at
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching integration status:', error);
    }
  };

  const fetchAvailableSystems = async () => {
    try {
      const response = await fetch('/api/integrations/available-systems', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Only update if we got valid data
        if (data.hris_systems && data.hris_systems.length > 0) {
          setAvailableSystems(data);
        }
        // Otherwise keep the default systems
      }
    } catch (error) {
      console.error('Error fetching available systems:', error);
      // Keep default systems on error
    }
  };

  const handleConnect = (system) => {
    setCurrentSystem(system);
    setCredentials({});
    setTestResult(null);
    setShowModal(true);
  };

  const handleDisconnect = async (systemId) => {
    if (!confirm(`Are you sure you want to disconnect from ${systemId}?`)) {
      return;
    }

    setLoading(prev => ({ ...prev, [systemId]: true }));
    
    try {
      const response = await fetch(`/api/integrations/hris/disconnect/${systemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setIntegrations(prev => ({
          ...prev,
          [systemId]: { connected: false, lastSync: null }
        }));
        alert(`Successfully disconnected from ${systemId}`);
      } else {
        const error = await response.json();
        alert(`Failed to disconnect: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [systemId]: false }));
    }
  };

  const handleTestConnection = async () => {
    setLoading(prev => ({ ...prev, test: true }));
    setTestResult(null);
    
    try {
      const response = await fetch('/api/integrations/hris/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          system: currentSystem.id,
          credentials: credentials,
          test_only: true
        })
      });
      
      const result = await response.json();
      setTestResult(result);
      
      if (!result.success) {
        alert(`Test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ success: false, error: 'Connection test failed' });
    } finally {
      setLoading(prev => ({ ...prev, test: false }));
    }
  };

  const handleSaveConnection = async () => {
    setLoading(prev => ({ ...prev, save: true }));
    
    try {
      const response = await fetch('/api/integrations/hris/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          system: currentSystem.id,
          credentials: credentials,
          test_only: false
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIntegrations(prev => ({
          ...prev,
          [currentSystem.id]: { 
            connected: true, 
            lastSync: null,
            employeeCount: result.employee_count 
          }
        }));
        setShowModal(false);
        alert(`Successfully connected to ${currentSystem.name}!`);
        fetchIntegrationStatus(); // Refresh status
      } else {
        alert(`Failed to connect: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving connection:', error);
      alert('Failed to save connection. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  const handleSync = async (systemId) => {
    setLoading(prev => ({ ...prev, [`sync_${systemId}`]: true }));
    
    try {
      const response = await fetch(`/api/integrations/hris/sync?system=${systemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Sync started! This may take a few minutes.');
        // Refresh status after a delay
        setTimeout(fetchIntegrationStatus, 5000);
      } else {
        alert('Failed to start sync');
      }
    } catch (error) {
      console.error('Error starting sync:', error);
      alert('Failed to start sync. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [`sync_${systemId}`]: false }));
    }
  };

  const handleAIProviderSetup = async (provider) => {
    const apiKey = prompt(`Enter your ${provider.name} API key:`);
    if (!apiKey) return;
    
    setLoading(prev => ({ ...prev, ai: true }));
    
    try {
      const response = await fetch('/api/integrations/ai-scoring/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          provider: provider.id,
          api_key: apiKey,
          test_only: false
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIntegrations(prev => ({
          ...prev,
          ai_scoring: { 
            enabled: true, 
            provider: provider.id 
          }
        }));
        alert(`AI scoring configured with ${provider.name}!`);
      } else {
        alert(`Failed to configure AI: ${result.error || 'Invalid API key'}`);
      }
    } catch (error) {
      console.error('Error configuring AI:', error);
      alert('Failed to configure AI scoring');
    } finally {
      setLoading(prev => ({ ...prev, ai: false }));
    }
  };

  const runBatchAIScoring = async () => {
    setLoading(prev => ({ ...prev, batch: true }));
    
    try {
      const response = await fetch('/api/integrations/ai-scoring/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('AI scoring started for all employees! This will run in the background.');
      } else {
        alert('Failed to start AI scoring');
      }
    } catch (error) {
      console.error('Error starting batch scoring:', error);
      alert('Failed to start batch scoring');
    } finally {
      setLoading(prev => ({ ...prev, batch: false }));
    }
  };

  const hrisSystems = availableSystems.hris_systems || DEFAULT_HRIS_SYSTEMS;
  const aiProviders = availableSystems.ai_providers || DEFAULT_AI_PROVIDERS;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Integrations</h2>
        <p className="text-sm text-gray-600">
          Connect your HR systems and enable AI-powered features to enhance retention predictions.
        </p>
      </div>

      {/* HRIS Integrations Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">HRIS Integrations</h3>
        <p className="text-sm text-gray-600 mb-6">
          Connect your HR system to automatically sync employee data and keep predictions up-to-date.
        </p>

        {/* HRIS Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hrisSystems.map(system => {
            const integration = integrations[system.id] || {};
            
            return (
              <div key={system.id} className="bg-white border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{system.name}</h4>
                      <p className="text-xs text-gray-500">{system.description}</p>
                    </div>
                  </div>
                </div>
                
                {integration.connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Connected
                    </div>
                    {integration.employeeCount && (
                      <p className="text-xs text-gray-600">
                        {integration.employeeCount} employees synced
                      </p>
                    )}
                    {integration.lastSync && (
                      <p className="text-xs text-gray-500">
                        Last sync: {new Date(integration.lastSync).toLocaleString()}
                      </p>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSync(system.id)}
                        disabled={loading[`sync_${system.id}`]}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading[`sync_${system.id}`] ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(system.id)}
                        disabled={loading[system.id]}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {integration.error && (
                      <p className="text-xs text-red-600 mb-2">{integration.error}</p>
                    )}
                    <button
                      onClick={() => handleConnect(system)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Setup time: ~{system.setup_time}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Scoring Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Engagement Scoring</h3>
        
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          {integrations.ai_scoring.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Brain className="w-6 h-6 text-indigo-600" />
                  <div>
                    <p className="font-semibold text-gray-900">AI Scoring Active</p>
                    <p className="text-sm text-gray-600">
                      Provider: {integrations.ai_scoring.provider}
                    </p>
                  </div>
                </div>
                <button
                  onClick={runBatchAIScoring}
                  disabled={loading.batch}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading.batch ? 'Running...' : 'Run Analysis'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-4">
                Enable AI to automatically analyze communication patterns and generate accurate engagement scores.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiProviders.map(provider => (
                  <div key={provider.id} className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{provider.name}</h4>
                    <p className="text-xs text-gray-600 mb-3">{provider.description}</p>
                    <ul className="text-xs text-gray-500 mb-3 space-y-1">
                      {provider.features.map((feature, idx) => (
                        <li key={idx}>• {feature}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleAIProviderSetup(provider)}
                      disabled={loading.ai}
                      className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading.ai ? 'Setting up...' : 'Configure'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Modal */}
      {showModal && currentSystem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Connect to {currentSystem.name}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Required Fields */}
              {Object.entries(currentSystem.required_fields || {}).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} *
                  </label>
                  <input
                    type={key.includes('password') || key.includes('secret') ? 'password' : 'text'}
                    value={credentials[key] || ''}
                    onChange={(e) => setCredentials({ ...credentials, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                </div>
              ))}
              
              {/* Optional Fields */}
              {Object.entries(currentSystem.optional_fields || {}).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} (Optional)
                  </label>
                  <input
                    type="text"
                    value={credentials[key] || ''}
                    onChange={(e) => setCredentials({ ...credentials, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                </div>
              ))}
              
              {/* Test Result */}
              {testResult && (
                <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <div className="flex items-center">
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-2" />
                    )}
                    <span className="text-sm">
                      {testResult.success 
                        ? `Test successful! Found ${testResult.employee_count || 0} employees.`
                        : testResult.error}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleTestConnection}
                  disabled={loading.test || !Object.keys(credentials).length}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading.test ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSaveConnection}
                  disabled={loading.save || !testResult?.success}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading.save ? 'Saving...' : 'Save & Connect'}
                </button>
              </div>
              
              {/* Documentation Link */}
              {currentSystem.documentation_url && (
                <p className="text-xs text-center text-gray-500 pt-2">
                  Need help? <a 
                    href={currentSystem.documentation_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View documentation
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsSettings;