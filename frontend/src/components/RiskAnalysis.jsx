import React, { useState, useEffect } from 'react';
import { LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Calendar, MessageSquare, Mail, Activity, Briefcase, Users, Clock, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

const RiskAnalysis = ({ employee }) => {
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningPrediction, setRunningPrediction] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchEmployeeDetails();
    }
  }, [employee]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await api.getEmployeeDetails(employee.id);
      setEmployeeDetails(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      setLoading(false);
    }
  };

  const runNewPrediction = async () => {
    setRunningPrediction(true);
    try {
      await api.runPrediction(employee.id);
      // Wait a moment for the prediction to process
      setTimeout(() => {
        fetchEmployeeDetails();
        setRunningPrediction(false);
      }, 3000);
    } catch (error) {
      console.error('Error running prediction:', error);
      setRunningPrediction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const riskFactors = employeeDetails?.current_risk?.factors || {};
  const latestPrediction = employeeDetails?.latest_prediction;
  const history = employeeDetails?.history || [];

  // Prepare radar chart data
  const radarData = [
    { subject: 'Communication', value: riskFactors.declining_communication === 'high' ? 90 : 30 },
    { subject: 'Sentiment', value: riskFactors.negative_sentiment === 'high' ? 85 : 25 },
    { subject: 'Burnout', value: riskFactors.burnout_risk === 'high' ? 80 : 20 },
    { subject: 'Engagement', value: riskFactors.low_meeting_engagement === 'high' ? 75 : 35 },
    { subject: 'Performance', value: riskFactors.declining_performance === 'high' ? 70 : 30 },
    { subject: 'Isolation', value: riskFactors.social_isolation === 'medium' ? 60 : 20 }
  ];

  // Prepare trend data
  const trendData = history.slice(0, 10).reverse().map((h, index) => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    risk: (h.risk_score * 100).toFixed(1)
  }));

  const getRiskLevel = (score) => {
    if (score >= 0.75) return { text: 'High Risk', color: 'text-red-600 bg-red-100' };
    if (score >= 0.5) return { text: 'Medium Risk', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'Low Risk', color: 'text-green-600 bg-green-100' };
  };

  const currentRiskLevel = getRiskLevel(employeeDetails?.current_risk?.score || 0);

  return (
    <div className="space-y-6">
      {/* Employee Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{employeeDetails?.employee?.name}</h2>
            <p className="text-gray-600 mt-1">{employeeDetails?.employee?.position} • {employeeDetails?.employee?.department}</p>
            <p className="text-sm text-gray-500 mt-2">Employee ID: {employeeDetails?.employee?.id}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full ${currentRiskLevel.color}`}>
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="font-medium">{currentRiskLevel.text}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {((employeeDetails?.current_risk?.score || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Risk Score</p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={runNewPrediction}
            disabled={runningPrediction}
            className="btn-primary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${runningPrediction ? 'animate-spin' : ''}`} />
            {runningPrediction ? 'Running Analysis...' : 'Run New Analysis'}
          </button>
        </div>
      </div>

      {/* Risk Factors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Factor Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Risk Level" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Score Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="risk" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Prediction Details */}
      {latestPrediction && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Prediction Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Confidence Level</p>
              <p className="text-xl font-semibold text-gray-900">
                {(latestPrediction.confidence * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Predicted Departure Window</p>
              <p className="text-xl font-semibold text-red-600">
                {latestPrediction.departure_window}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Analysis Date</p>
              <p className="text-xl font-semibold text-gray-900">
                {new Date(latestPrediction.date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Top Risk Indicators */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Top Risk Indicators</h4>
            <div className="flex flex-wrap gap-2">
              {latestPrediction.top_risks?.map((risk, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                >
                  {risk.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommended Interventions */}
      {latestPrediction?.interventions && latestPrediction.interventions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Interventions</h3>
          <div className="space-y-4">
            {latestPrediction.interventions.map((intervention, index) => (
              <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{intervention.action}</p>
                    <p className="text-sm text-gray-600 mt-1">Timeline: {intervention.timeline}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    intervention.priority === 'high' ? 'bg-red-100 text-red-800' :
                    intervention.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {intervention.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Communication</p>
              <p className="text-lg font-semibold">
                {riskFactors.declining_communication === 'high' ? 'Declining' : 'Stable'}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Work-Life Balance</p>
              <p className="text-lg font-semibold">
                {riskFactors.burnout_risk === 'high' ? 'Poor' : 'Good'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Integration</p>
              <p className="text-lg font-semibold">
                {riskFactors.social_isolation === 'medium' ? 'Limited' : 'Good'}
              </p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Performance</p>
              <p className="text-lg font-semibold">
                {riskFactors.declining_performance === 'high' ? 'Declining' : 'Stable'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysis;