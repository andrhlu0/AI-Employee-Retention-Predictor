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

  const generateInterventionsFromEmployees = () => {
    // Get employees from localStorage
    const storedEmployees = localStorage.getItem('employees');
    if (!storedEmployees) return [];
    
    const employees = JSON.parse(storedEmployees);
    const allInterventions = [];
    
    employees.forEach((employee, empIndex) => {
      // Only generate interventions for employees with meaningful risk
      if (employee.risk_score && employee.risk_score > 0.2) {
        // Determine priority based on actual risk score
        let priority;
        if (employee.risk_score >= 0.75) {
          priority = 'critical';
        } else if (employee.risk_score >= 0.5) {
          priority = 'high';
        } else if (employee.risk_score >= 0.25) {
          priority = 'medium';
        } else {
          priority = 'low';
        }
        
        // Check if employee already has interventions from upload
        if (employee.interventions && employee.interventions.length > 0) {
          // Use existing interventions with correct priority
          employee.interventions.forEach((intervention, intIndex) => {
            allInterventions.push({
              id: `INT-${employee.employee_id || employee.id}-${intIndex}`,
              employee: employee.name,
              employee_id: employee.employee_id || employee.id,
              department: employee.department,
              risk_score: employee.risk_score,
              intervention: {
                action: intervention.action,
                priority: intervention.priority || priority, // Use intervention priority or calculated
                timeline: intervention.timeline,
                owner: intervention.owner,
                type: intervention.type,
                status: intervention.status || 'pending'
              },
              created_date: intervention.created_date || new Date().toISOString()
            });
          });
        } else {
          // Generate interventions based on risk factors and score
          const generatedInterventions = generateInterventionsForEmployee(employee);
          generatedInterventions.forEach((intervention, intIndex) => {
            allInterventions.push({
              id: `INT-${employee.employee_id || employee.id}-${intIndex}`,
              employee: employee.name,
              employee_id: employee.employee_id || employee.id,
              department: employee.department,
              risk_score: employee.risk_score,
              intervention: {
                ...intervention,
                status: 'pending'
              },
              created_date: new Date().toISOString()
            });
          });
        }
      }
    });
    
    return allInterventions;
  };

  const generateInterventionsForEmployee = (employee) => {
    const interventions = [];
    const riskScore = employee.risk_score;
    const riskFactors = employee.risk_factors || {};
    
    // Determine priority based on risk score
    let basePriority;
    if (riskScore >= 0.75) {
      basePriority = 'critical';
    } else if (riskScore >= 0.5) {
      basePriority = 'high';
    } else if (riskScore >= 0.25) {
      basePriority = 'medium';
    } else {
      basePriority = 'low';
    }
    
    // Critical risk interventions
    if (riskScore >= 0.75) {
      interventions.push({
        action: 'Immediate Retention Discussion',
        priority: 'critical',
        timeline: 'immediately',
        owner: 'Manager + HR',
        type: 'retention'
      });
      interventions.push({
        action: 'Emergency Compensation Review',
        priority: 'critical',
        timeline: 'within 24 hours',
        owner: 'HR + Leadership',
        type: 'compensation'
      });
    }
    
    // High risk interventions
    if (riskScore >= 0.5) {
      interventions.push({
        action: 'Schedule 1:1 Check-in',
        priority: basePriority === 'critical' ? 'high' : basePriority,
        timeline: 'within 3 days',
        owner: 'Direct Manager',
        type: 'engagement'
      });
    }
    
    // Risk factor-based interventions
    if (riskFactors.burnout_risk === 'high' || riskFactors.workload_imbalance) {
      interventions.push({
        action: 'Workload Review & Adjustment',
        priority: riskScore >= 0.5 ? 'high' : 'medium',
        timeline: riskScore >= 0.5 ? 'within 1 week' : 'within 2 weeks',
        owner: 'Manager',
        type: 'workload'
      });
    }
    
    if (riskFactors.low_engagement === 'high' || riskFactors.negative_sentiment === 'high') {
      interventions.push({
        action: 'Employee Wellness Check',
        priority: riskScore >= 0.5 ? 'high' : 'medium',
        timeline: 'within 1 week',
        owner: 'HR Partner',
        type: 'wellness'
      });
    }
    
    if (riskFactors.performance_issues || riskFactors.declining_performance === 'high') {
      interventions.push({
        action: 'Performance Support Plan',
        priority: 'medium',
        timeline: 'within 2 weeks',
        owner: 'Manager + HR',
        type: 'performance'
      });
    }
    
    if (riskFactors.promotion_overdue || employee.last_promotion) {
      const lastPromoDate = new Date(employee.last_promotion);
      const monthsSincePromo = (new Date() - lastPromoDate) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSincePromo > 24) {
        interventions.push({
          action: 'Career Development Discussion',
          priority: riskScore >= 0.5 ? 'high' : 'medium',
          timeline: 'within 1 week',
          owner: 'Manager',
          type: 'career'
        });
      }
    }
    
    // If no specific interventions generated but risk is significant, add general intervention
    if (interventions.length === 0 && riskScore >= 0.3) {
      interventions.push({
        action: 'General Check-in Meeting',
        priority: basePriority,
        timeline: riskScore >= 0.5 ? 'within 1 week' : 'within 2 weeks',
        owner: 'Direct Manager',
        type: 'engagement'
      });
    }
    
    return interventions;
  };

  const fetchInterventions = async () => {
    try {
      setLoading(true);
      
      // First check localStorage for interventions from uploaded data
      const storedInterventions = localStorage.getItem('interventions');
      
      if (storedInterventions) {
        // Use stored interventions from uploaded data
        const interventions = JSON.parse(storedInterventions);
        setInterventions(interventions);
      } else {
        // Generate interventions from employees if available
        const generatedInterventions = generateInterventionsFromEmployees();
        
        if (generatedInterventions.length > 0) {
          setInterventions(generatedInterventions);
          // Save to localStorage for persistence
          localStorage.setItem('interventions', JSON.stringify(generatedInterventions));
        } else {
          // Try API call
          try {
            const response = await api.getInterventions();
            setInterventions(response.data);
            localStorage.setItem('interventions', JSON.stringify(response.data));
          } catch (apiError) {
            // No data available
            setInterventions([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching interventions:', error);
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  };

  const updateInterventionStatus = async (id, newStatus) => {
    // Update status locally
    const updatedInterventions = interventions.map(item => 
      item.id === id ? { ...item, intervention: { ...item.intervention, status: newStatus } } : item
    );
    
    setInterventions(updatedInterventions);
    
    // Persist to localStorage
    localStorage.setItem('interventions', JSON.stringify(updatedInterventions));
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
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Calculate statistics
  const stats = {
    total: interventions.length,
    active: interventions.filter(i => i.intervention.status !== 'completed').length,
    critical: interventions.filter(i => i.intervention.priority === 'critical').length,
    high: interventions.filter(i => i.intervention.priority === 'high').length,
    inProgress: interventions.filter(i => i.intervention.status === 'in_progress').length,
    completed: interventions.filter(i => i.intervention.status === 'completed').length
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
            <p className="text-gray-600 mt-1">
              {interventions.length > 0 
                ? `Managing ${stats.active} active interventions across ${new Set(interventions.map(i => i.department)).size} departments`
                : 'No interventions available. Upload employee data to generate interventions.'}
            </p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <Target className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Priority</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Interventions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {filteredInterventions.length > 0 ? 'Active Interventions' : 'No Interventions Available'}
          </h3>
        </div>
        
        {filteredInterventions.length > 0 ? (
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
                      
                      <span className={`font-medium ${
                        item.risk_score >= 0.75 ? 'text-red-600' :
                        item.risk_score >= 0.5 ? 'text-orange-600' :
                        item.risk_score >= 0.25 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
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
        ) : (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No interventions found.</p>
            <p className="text-sm text-gray-400 mt-2">
              Upload employee data to automatically generate interventions based on risk scores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterventionSuggestions;