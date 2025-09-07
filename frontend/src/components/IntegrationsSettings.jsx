// frontend/src/components/IntegrationsSettings.jsx
import React, { useState, useEffect } from 'react';
import { 
  Slack, Mail, Calendar, Brain, Shield, CheckCircle, 
  AlertCircle, Settings, Link2, Loader, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';

const IntegrationsSettings = () => {
  const [integrations, setIntegrations] = useState({
    slack: { connected: false, status: 'disconnected', lastSync: null },
    google: { connected: false, status: 'disconnected', lastSync: null },
    microsoft: { connected: false, status: 'disconnected', lastSync: null },
    ai_scoring: { enabled: false, status: 'inactive', lastRun: null }
  });
  
  const [loading, setLoading] = useState({});
  const [aiConfig, setAiConfig] = useState({
    autoScore: false,
    scoreFrequency: 'daily',
    includeSlack: true,
    includeEmail: true,
    includeCalendar: true,
    confidenceThreshold: 0.7
  });

  const handleSlackConnect = async () => {
    setLoading({ ...loading, slack: true });
    
    try {
      // OAuth flow
      const response = await api.post('/api/integrations/slack/auth', {
        redirect_uri: window.location.origin + '/settings/integrations/callback'
      });
      
      // Open OAuth window
      const authWindow = window.open(
        response.data.auth_url,
        'Slack Authorization',
        'width=500,height=600'
      );
      
      // Listen for callback
      const checkAuth = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkAuth);
          checkSlackConnection();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error connecting Slack:', error);
    } finally {
      setLoading({ ...loading, slack: false });
    }
  };

  const handleGoogleConnect = async () => {
    setLoading({ ...loading, google: true });
    
    try {
      const response = await api.post('/api/integrations/google/auth', {
        scopes: ['email', 'calendar', 'gmail.readonly']
      });
      
      const authWindow = window.open(
        response.data.auth_url,
        'Google Authorization',
        'width=500,height=600'
      );
      
      const checkAuth = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkAuth);
          checkGoogleConnection();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error connecting Google:', error);
    } finally {
      setLoading({ ...loading, google: false });
    }
  };

  const handleMicrosoftConnect = async () => {
    setLoading({ ...loading, microsoft: true });
    
    try {
      const response = await api.post('/api/integrations/microsoft/auth', {
        scopes: ['Mail.Read', 'Calendars.Read', 'User.Read']
      });
      
      const authWindow = window.open(
        response.data.auth_url,
        'Microsoft Authorization',
        'width=500,height=600'
      );
      
      const checkAuth = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkAuth);
          checkMicrosoftConnection();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error connecting Microsoft:', error);
    } finally {
      setLoading({ ...loading, microsoft: false });
    }
  };

  const enableAIScoring = async () => {
    setLoading({ ...loading, ai: true });
    
    try {
      const response = await api.post('/api/integrations/ai-scoring/enable', aiConfig);
      
      if (response.data.success) {
        setIntegrations({
          ...integrations,
          ai_scoring: {
            enabled: true,
            status: 'active',
            lastRun: new Date().toISOString()
          }
        });
        
        // Save to localStorage
        localStorage.setItem('ai_scoring_enabled', 'true');
        localStorage.setItem('ai_config', JSON.stringify(aiConfig));
        
        alert('AI Scoring enabled successfully!');
      }
    } catch (error) {
      console.error('Error enabling AI scoring:', error);
      alert('Failed to enable AI scoring. Please check your API keys.');
    } finally {
      setLoading({ ...loading, ai: false });
    }
  };

  const runAIAnalysis = async () => {
    setLoading({ ...loading, analysis: true });
    
    try {
      const response = await api.post('/api/integrations/ai-scoring/run');
      
      if (response.data.success) {
        alert(`AI Analysis complete! Processed ${response.data.employees_processed} employees.`);
        
        // Refresh dashboard data
        window.dispatchEvent(new CustomEvent('dataUpdated', { 
          detail: { source: 'ai_analysis' }
        }));
      }
    } catch (error) {
      console.error('Error running AI analysis:', error);
    } finally {
      setLoading({ ...loading, analysis: false });
    }
  };

  const checkSlackConnection = async () => {
    try {
      const response = await api.get('/api/integrations/slack/status');
      setIntegrations({
        ...integrations,
        slack: response.data
      });
    } catch (error) {
      console.error('Error checking Slack status:', error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const response = await api.get('/api/integrations/google/status');
      setIntegrations({
        ...integrations,
        google: response.data
      });
    } catch (error) {
      console.error('Error checking Google status:', error);
    }
  };

  const checkMicrosoftConnection = async () => {
    try {
      const response = await api.get('/api/integrations/microsoft/status');
      setIntegrations({
        ...integrations,
        microsoft: response.data
      });
    } catch (error) {
      console.error('Error checking Microsoft status:', error);
    }
  };

  useEffect(() => {
    // Check all connection statuses on mount
    checkSlackConnection();
    checkGoogleConnection();
    checkMicrosoftConnection();
    
    // Load AI config from localStorage
    const savedConfig = localStorage.getItem('ai_config');
    if (savedConfig) {
      setAiConfig(JSON.parse(savedConfig));
    }
    
    const aiEnabled = localStorage.getItem('ai_scoring_enabled') === 'true';
    if (aiEnabled) {
      setIntegrations(prev => ({
        ...prev,
        ai_scoring: { ...prev.ai_scoring, enabled: true, status: 'active' }
      }));
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Third-Party Integrations</h3>
        <p className="text-sm text-gray-600 mb-6">
          Connect your communication and productivity tools for enhanced engagement scoring and better predictions.
        </p>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {/* Slack Integration */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Slack className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Slack</h4>
                <p className="text-sm text-gray-600">Analyze communication patterns and sentiment</p>
                {integrations.slack.connected && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {new Date(integrations.slack.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {integrations.slack.connected ? (
                <>
                  <span className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect('slack')}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSlackConnect}
                  disabled={loading.slack}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                >
                  {loading.slack ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Google Workspace Integration */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Google Workspace</h4>
                <p className="text-sm text-gray-600">Email patterns and calendar analytics</p>
                {integrations.google.connected && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {new Date(integrations.google.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {integrations.google.connected ? (
                <>
                  <span className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect('google')}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGoogleConnect}
                  disabled={loading.google}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {loading.google ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Microsoft 365 Integration */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Microsoft 365</h4>
                <p className="text-sm text-gray-600">Teams, Outlook, and calendar data</p>
                {integrations.microsoft.connected && (
                  <p className="text-xs text-green-600 mt-1">
                    Last synced: {new Date(integrations.microsoft.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {integrations.microsoft.connected ? (
                <>
                  <span className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect('microsoft')}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleMicrosoftConnect}
                  disabled={loading.microsoft}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center"
                >
                  {loading.microsoft ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Scoring Configuration */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Engagement Scoring</h3>
        
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Brain className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Advanced AI Analysis</h4>
              <p className="text-sm text-gray-600 mt-1">
                Use artificial intelligence to automatically analyze communication patterns, email sentiment, 
                and calendar changes to generate highly accurate engagement scores.
              </p>
              
              {integrations.ai_scoring.enabled ? (
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      AI Scoring Active
                    </span>
                    <button
                      onClick={runAIAnalysis}
                      disabled={loading.analysis}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                      {loading.analysis ? (
                        <Loader className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      Run Analysis Now
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Auto-score frequency:</span>
                      <select
                        value={aiConfig.scoreFrequency}
                        onChange={(e) => setAiConfig({...aiConfig, scoreFrequency: e.target.value})}
                        className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="realtime">Real-time</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Confidence threshold:</span>
                      <input
                        type="number"
                        min="0.5"
                        max="1"
                        step="0.1"
                        value={aiConfig.confidenceThreshold}
                        onChange={(e) => setAiConfig({...aiConfig, confidenceThreshold: parseFloat(e.target.value)})}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2 pt-2">
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={aiConfig.includeSlack}
                          onChange={(e) => setAiConfig({...aiConfig, includeSlack: e.target.checked})}
                          className="mr-2"
                        />
                        Include Slack data in analysis
                      </label>
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={aiConfig.includeEmail}
                          onChange={(e) => setAiConfig({...aiConfig, includeEmail: e.target.checked})}
                          className="mr-2"
                        />
                        Include email patterns in analysis
                      </label>
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={aiConfig.includeCalendar}
                          onChange={(e) => setAiConfig({...aiConfig, includeCalendar: e.target.checked})}
                          className="mr-2"
                        />
                        Include calendar data in analysis
                      </label>
                    </div>
                    
                    <div className="pt-3">
                      <button
                        onClick={() => saveAIConfig()}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                      >
                        Update Configuration
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-yellow-800 flex items-start">
                      <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      Connect at least one integration above before enabling AI scoring for best results.
                    </p>
                  </div>
                  
                  <button
                    onClick={enableAIScoring}
                    disabled={loading.ai || (!integrations.slack.connected && !integrations.google.connected && !integrations.microsoft.connected)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading.ai ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    Enable AI Scoring
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Configuration</h3>
        
        <div className="bg-white border rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <input
                type="password"
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                onChange={(e) => localStorage.setItem('openai_api_key', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Required for AI-powered engagement scoring</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://your-domain.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Receive real-time updates when risk scores change</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsSettings;