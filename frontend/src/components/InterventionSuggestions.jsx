import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Target, Calendar, User, Filter } from 'lucide-react';
import { api } from '../services/api';

const InterventionSuggestions = () => {
  const [interventions, setInterventions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterventions();
    
    // Listen for data updates
    const handleDataUpdate = () => {
      fetchInterventions();
    };
    
    window.addEventListener('dataUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, []);

    const fetchInterventions = async () => {
    try {
      setLoading(true);
      
      // First check localStorage for interventions
      const storedInterventions = localStorage.getItem('interventions');
      if (storedInterventions) {
        const interventions = JSON.parse(storedInterventions);
        setInterventions(interventions);
        setLoading(false);
        return;
      }
      
      // Try API call
      try {
        const response = await api.getInterventions();
        setInterventions(response.data);
        localStorage.setItem('interventions', JSON.stringify(response.data));
      } catch (apiError) {
        // Use default mock data if no stored data and API fails
        const mockInterventions = generateMockInterventions();
        setInterventions(mockInterventions);
      }
    } catch (error) {
      console.error('Error fetching interventions:', error);
    } finally {
      setLoading(false);
    }
  };

    const updateInterventionStatus = async (id, newStatus) => {
      // Update status locally for demo
      setInterventions(prev => prev.map(item => 
        item.id === id ? { ...item, intervention: { ...item.intervention, status: newStatus } } : item
      ));
    };

    const filteredInterventions = interventions.filter(item => {
      if (filter === 'all') return true;
      return item.intervention.status === filter;
    });

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed':
          return 'text-green-600 bg-green-100';
        case 'in_progress':
          return 'text-blue-600 bg-blue-100';
        case 'pending':
          return 'text-yellow-600 bg-yellow-100';
        default:
          return 'text-gray-600 bg-gray-100';
      }
    };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Intervention Management</h2>
            <p className="text-gray-600 mt-1">Track and manage recommended interventions for at-risk employees</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Interventions</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {interventions.filter(i => i.intervention.status !== 'completed').length}
              </p>
            </div>
            <Target className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-red-600">
                {interventions.filter(i => i.intervention.priority === 'high').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {interventions.filter(i => i.intervention.status === 'in_progress').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {interventions.filter(i => i.intervention.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Interventions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Interventions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredInterventions.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">{item.employee}</h4>
                    <span className="ml-2 text-sm text-gray-500">• {item.department}</span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{item.intervention.action}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(item.intervention.priority)}`}>
                      {item.intervention.priority.toUpperCase()} PRIORITY
                    </span>
                    
                    <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(item.intervention.status)}`}>
                      {item.intervention.status.replace('_', ' ').toUpperCase()}
                    </span>
                    
                    <span className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      {item.intervention.timeline}
                    </span>
                    
                    <span className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                      Created {new Date(item.created_date).toLocaleDateString()}
                    </span>
                    
                    <span className="text-red-600 font-medium">
                      Risk: {(item.risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div className="ml-4">
                  <select
                    value={item.intervention.status}
                    onChange={(e) => updateInterventionStatus(item.id, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              
              {item.intervention.status === 'completed' && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Intervention completed successfully
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredInterventions.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">No interventions found matching the selected filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterventionSuggestions;