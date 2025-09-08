// Fixed RiskAnalysis.jsx - COMPLETE FILE
// Save this as: frontend/src/components/RiskAnalysis.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, TrendingUp, RefreshCw, ArrowLeft,
  Activity, Users, Brain, Calendar, ExternalLink
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const RiskAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningPrediction, setRunningPrediction] = useState(false);

  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]); // Re-fetch when ID changes

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/employees/${id}`);
      setEmployeeDetails(response.data);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      // Use mock data specific to this employee ID
      setEmployeeDetails(getMockEmployeeDetails(id));
    } finally {
      setLoading(false);
    }
  };

  const getMockEmployeeDetails = (employeeId) => {
    // Get stored employees from localStorage
    const storedEmployees = localStorage.getItem('employees');
    let employeeData = null;
    
    if (storedEmployees) {
      const employees = JSON.parse(storedEmployees);
      employeeData = employees.find(emp => 
        emp.employee_id === employeeId || emp.id === employeeId || emp.id === parseInt(employeeId)
      );
    }

    // If no employee found in storage, create a default one
    if (!employeeData) {
      employeeData = {
        id: employeeId,
        employee_id: employeeId,
        name: `Employee ${employeeId}`,
        email: `employee${employeeId}@company.com`,
        position: 'Senior Developer',
        department: 'Engineering',
        risk_score: 0.65 + (Math.random() * 0.3)
      };
    }

    // Generate historical data specific to this employee
    const history = [];
    const today = new Date();
    const baseRisk = employeeData.risk_score || 0.65;
    
    for (let i = 9; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7));
      history.push({
        date: date.toISOString(),
        risk_score: Math.max(0, Math.min(1, baseRisk + (Math.random() * 0.2) - 0.1)),
        confidence: 0.85 + (Math.random() * 0.1)
      });
    }

    // Generate risk factors based on the employee's risk score
    const riskLevel = employeeData.risk_score >= 0.75 ? 'high' : 
                     employeeData.risk_score >= 0.5 ? 'medium' : 'low';

    return {
      employee: {
        id: employeeData.id || employeeId,
        employee_id: employeeData.employee_id || employeeId,
        name: employeeData.name,
        email: employeeData.email,
        position: employeeData.position || 'Employee',
        department: employeeData.department || 'General',
        tenure_years: employeeData.tenure_years || Math.floor(Math.random() * 10) + 1,
        last_promotion: employeeData.last_promotion || '2022-06-15',
        manager: employeeData.manager || 'John Manager'
      },
      current_risk: {
        score: employeeData.risk_score,
        factors: {
          burnout_risk: riskLevel,
          negative_sentiment: riskLevel === 'high' ? 'medium' : 'low',
          low_engagement: riskLevel,
          declining_performance: riskLevel === 'high' ? 'medium' : 'low',
          social_isolation: riskLevel === 'high' ? 'medium' : 'low',
          low_meeting_engagement: riskLevel
        },
        last_updated: new Date().toISOString()
      },
      latest_prediction: {
        risk_score: employeeData.risk_score,
        confidence: 0.88 + (Math.random() * 0.1),
        departure_window: riskLevel === 'high' ? '1-3 months' : 
                         riskLevel === 'medium' ? '3-6 months' : '6+ months',
        date: new Date().toISOString(),
        top_factors: [
          { factor: 'Burnout Risk', impact: 0.35 },
          { factor: 'Low Engagement', impact: 0.28 },
          { factor: 'Negative Sentiment', impact: 0.22 }
        ]
      },
      history: history,
      interventions: generateInterventionsForEmployee(employeeData)
    };
  };

  const generateInterventionsForEmployee = (employee) => {
    const interventions = [];
    const riskLevel = employee.risk_score >= 0.75 ? 'critical' : 
                     employee.risk_score >= 0.5 ? 'high' : 'medium';

    if (riskLevel === 'critical') {
      interventions.push({
        action: 'Immediate One-on-One',
        description: `Schedule urgent meeting with ${employee.name} to discuss concerns`,
        priority: 'critical',
        timeline: 'within 24 hours',
        owner: 'Direct Manager',
        status: 'pending'
      });
      interventions.push({
        action: 'Retention Review',
        description: 'Review compensation and career progression opportunities',
        priority: 'high',
        timeline: 'within 3 days',
        owner: 'HR Partner',
        status: 'pending'
      });
    } else if (riskLevel === 'high') {
      interventions.push({
        action: 'Check-in Meeting',
        description: 'Schedule regular check-in to discuss workload and satisfaction',
        priority: 'high',
        timeline: 'within 1 week',
        owner: 'Direct Manager',
        status: 'pending'
      });
    }

    interventions.push({
      action: 'Career Development Plan',
      description: 'Create and review career growth opportunities',
      priority: 'medium',
      timeline: 'within 2 weeks',
      owner: 'Manager + HR',
      status: 'pending'
    });

    return interventions;
  };

  const runNewPrediction = async () => {
    try {
      setRunningPrediction(true);
      await axios.post(`/api/v1/employees/${id}/predict`);
      await fetchEmployeeDetails();
    } catch (error) {
      console.error('Error running prediction:', error);
      // Simulate prediction update
      setTimeout(() => {
        setEmployeeDetails(prev => ({
          ...prev,
          current_risk: {
            ...prev.current_risk,
            score: Math.min(1, prev.current_risk.score + (Math.random() * 0.1) - 0.05),
            last_updated: new Date().toISOString()
          }
        }));
      }, 1000);
    } finally {
      setTimeout(() => setRunningPrediction(false), 1500);
    }
  };

  const viewAllInterventions = () => {
    // Navigate to interventions page with employee filter
    navigate(`/interventions?employee=${employeeDetails?.employee?.name}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employeeDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Employee not found</p>
        <button
          onClick={() => navigate('/employees')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  const { employee, current_risk, latest_prediction, history, interventions } = employeeDetails;
  const riskFactors = current_risk?.factors || {};

  // Prepare data for radar chart
  const radarData = [
    { subject: 'Burnout', value: riskFactors.burnout_risk === 'high' ? 90 : riskFactors.burnout_risk === 'medium' ? 50 : 20 },
    { subject: 'Sentiment', value: riskFactors.negative_sentiment === 'high' ? 85 : riskFactors.negative_sentiment === 'medium' ? 45 : 15 },
    { subject: 'Engagement', value: riskFactors.low_engagement === 'high' ? 80 : riskFactors.low_engagement === 'medium' ? 40 : 10 },
    { subject: 'Performance', value: riskFactors.declining_performance === 'high' ? 75 : riskFactors.declining_performance === 'medium' ? 35 : 15 },
    { subject: 'Isolation', value: riskFactors.social_isolation === 'high' ? 70 : riskFactors.social_isolation === 'medium' ? 30 : 10 },
    { subject: 'Meeting', value: riskFactors.low_meeting_engagement === 'high' ? 65 : riskFactors.low_meeting_engagement === 'medium' ? 35 : 20 }
  ];

  // Prepare trend data
  const trendData = history.slice(-10).map((h) => ({
    date: new Date(h.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    risk: (h.risk_score * 100).toFixed(1)
  }));

  const getRiskLevel = (score) => {
    if (score >= 0.75) return { text: 'High Risk', color: 'text-red-600 bg-red-100' };
    if (score >= 0.5) return { text: 'Medium Risk', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'Low Risk', color: 'text-green-600 bg-green-100' };
  };

  const currentRiskLevel = getRiskLevel(current_risk?.score || 0);
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/employees')}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Employees
      </button>

      {/* Employee Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
            <p className="text-gray-600 mt-1">
              {employee.position} • {employee.department} • ID: {employee.employee_id}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 text-gray-900">{employee.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Manager:</span>
                <span className="ml-2 text-gray-900">{employee.manager}</span>
              </div>
              <div>
                <span className="text-gray-500">Tenure:</span>
                <span className="ml-2 text-gray-900">{employee.tenure_years} years</span>
              </div>
              <div>
                <span className="text-gray-500">Last Promotion:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(employee.last_promotion).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentRiskLevel.color}`}>
              {currentRiskLevel.text}
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {(current_risk?.score * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Risk Score</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Factors Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Risk Factor Analysis</h3>
            <button
              onClick={runNewPrediction}
              disabled={runningPrediction}
              className="flex items-center px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${runningPrediction ? 'animate-spin' : ''}`} />
              {runningPrediction ? 'Running...' : 'Update'}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Risk Level" dataKey="value" stroke="#7B61FF" fill="#7B61FF" fillOpacity={0.6} />
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
              <Line type="monotone" dataKey="risk" stroke="#7B61FF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ML Prediction Details */}
      {latest_prediction && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Brain className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Latest ML Prediction</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Predicted Departure</p>
              <p className="text-xl font-bold text-gray-900">{latest_prediction.departure_window}</p>
              <p className="text-xs text-gray-500 mt-1">
                Confidence: {(latest_prediction.confidence * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(latest_prediction.date).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(latest_prediction.date).toLocaleTimeString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Top Risk Factors</p>
              {latest_prediction.top_factors.map((factor, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-gray-700">{factor.factor}</span>
                  <span className="font-semibold text-gray-900">
                    {(factor.impact * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommended Interventions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recommended Interventions</h3>
          <button
            onClick={viewAllInterventions}
            className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All Active Interventions
            <ExternalLink className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="space-y-4">
          {interventions?.map((intervention, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{intervention.action}</h4>
                  <p className="text-sm text-gray-600 mt-1">{intervention.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(intervention.priority)}`}>
                      {intervention.priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {intervention.timeline}
                    </span>
                    <span className="text-sm text-gray-500">
                      <Users className="w-4 h-4 inline mr-1" />
                      {intervention.owner}
                    </span>
                    {intervention.status && (
                      <span className="text-sm text-gray-500">
                        Status: <span className="font-medium">{intervention.status}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {interventions?.length === 0 && (
          <p className="text-gray-500 text-center py-4">No interventions recommended at this time.</p>
        )}
      </div>
    </div>
  );
};

export default RiskAnalysis;