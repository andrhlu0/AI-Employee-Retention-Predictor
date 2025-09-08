import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, Target, Calendar, User, Filter, ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
import { api } from '../services/api';

const InterventionSuggestions = () => {
  const [interventions, setInterventions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk_desc'); // Added sorting state
  const [loading, setLoading] = useState(true);
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());

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

  const toggleEmployeeExpanded = (employeeId) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  // Group interventions by employee
  const groupInterventionsByEmployee = () => {
    const grouped = {};
    
    interventions.forEach(item => {
      const key = item.employee_id || item.employee;
      if (!grouped[key]) {
        grouped[key] = {
          employee: item.employee,
          employee_id: item.employee_id,
          department: item.department,
          risk_score: item.risk_score,
          interventions: []
        };
      }
      grouped[key].interventions.push(item);
    });
    
    return Object.values(grouped);
  };

  // Sort grouped interventions based on selected option
  const sortGroupedInterventions = (groups) => {
    const sortedGroups = [...groups];
    
    switch (sortBy) {
      case 'risk_desc':
        return sortedGroups.sort((a, b) => b.risk_score - a.risk_score);
      case 'risk_asc':
        return sortedGroups.sort((a, b) => a.risk_score - b.risk_score);
      case 'name_asc':
        return sortedGroups.sort((a, b) => a.employee.localeCompare(b.employee));
      case 'name_desc':
        return sortedGroups.sort((a, b) => b.employee.localeCompare(a.employee));
      case 'dept_asc':
        return sortedGroups.sort((a, b) => {
          const deptCompare = a.department.localeCompare(b.department);
          if (deptCompare === 0) {
            return b.risk_score - a.risk_score; // Secondary sort by risk within department
          }
          return deptCompare;
        });
      case 'interventions_desc':
        return sortedGroups.sort((a, b) => {
          const aActive = a.interventions.filter(i => i.intervention.status !== 'completed').length;
          const bActive = b.interventions.filter(i => i.intervention.status !== 'completed').length;
          return bActive - aActive;
        });
      default:
        return sortedGroups;
    }
  };

  const filteredGroups = sortGroupedInterventions(
    groupInterventionsByEmployee().map(group => ({
      ...group,
      interventions: group.interventions.filter(item => {
        if (filter === 'all') return true;
        return item.intervention.status === filter;
      })
    })).filter(group => group.interventions.length > 0)
  );

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
    completed: interventions.filter(i => i.intervention.status === 'completed').length,
    employeesWithInterventions: filteredGroups.length
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
      {/* Header with BOTH dropdowns visible */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Intervention Management</h2>
          <p className="text-gray-600 mt-1">
            {interventions.length > 0 
              ? `Managing ${stats.active} active interventions for ${stats.employeesWithInterventions} employees across ${new Set(interventions.map(i => i.department)).size} departments`
              : 'No interventions available. Upload employee data to generate interventions.'}
          </p>
        </div>
        
        {/* Controls Section - BOTH DROPDOWNS HERE */}
        <div className="flex flex-wrap gap-3">
          {/* Sort By Dropdown */}
          <div className="flex items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
            <ArrowUpDown className="w-4 h-4 text-gray-500 mr-2" />
            <label className="text-sm font-medium text-gray-700 mr-2">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm cursor-pointer"
            >
              <option value="risk_desc">Risk: High to Low</option>
              <option value="risk_asc">Risk: Low to High</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="dept_asc">Department</option>
              <option value="interventions_desc">Most Active</option>
            </select>
          </div>
          
          {/* Filter Status Dropdown */}
          <div className="flex items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
            <Filter className="w-4 h-4 text-gray-500 mr-2" />
            <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm cursor-pointer"
            >
              <option value="all">All</option>
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

      {/* Grouped Interventions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {filteredGroups.length > 0 ? 
              `Active Interventions (${filteredGroups.length} Employees)` : 
              'No Interventions Available'}
          </h3>
        </div>
        
        {filteredGroups.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredGroups.map((group) => {
              const isExpanded = expandedEmployees.has(group.employee_id);
              const activeCount = group.interventions.filter(i => i.intervention.status !== 'completed').length;
              
              return (
                <div key={group.employee_id} className="border-l-4 border-primary-200">
                  {/* Employee Header */}
                  <div 
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleEmployeeExpanded(group.employee_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <button className="mr-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{group.employee}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="font-medium">{group.department}</span>
                            <span className={`font-medium ${
                              group.risk_score >= 0.75 ? 'text-red-600' :
                              group.risk_score >= 0.5 ? 'text-orange-600' :
                              group.risk_score >= 0.25 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              Risk: {(group.risk_score * 100).toFixed(0)}%
                            </span>
                            <span className="text-primary-600">
                              {group.interventions.length} intervention{group.interventions.length !== 1 ? 's' : ''}
                              {activeCount > 0 && ` (${activeCount} active)`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Risk Indicator */}
                      <div className="flex items-center gap-2">
                        {group.risk_score >= 0.75 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            CRITICAL
                          </span>
                        )}
                        {group.risk_score >= 0.5 && group.risk_score < 0.75 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            HIGH
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Interventions List - Collapsible */}
                  {isExpanded && (
                    <div className="bg-gray-50 px-6 py-4">
                      <div className="space-y-3">
                        {group.interventions.map((item) => (
                          <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-gray-700 font-medium mb-2">{item.intervention.action}</p>
                                
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                  <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(item.intervention.priority)}`}>
                                    {item.intervention.priority.toUpperCase()}
                                  </span>
                                  
                                  <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(item.intervention.status)}`}>
                                    {item.intervention.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                  
                                  <span className="flex items-center text-gray-600">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {item.intervention.timeline}
                                  </span>
                                  
                                  <span className="text-gray-600">
                                    Owner: {item.intervention.owner}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="ml-4">
                                <select
                                  value={item.intervention.status}
                                  onChange={(e) => updateInterventionStatus(item.id, e.target.value)}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                            </div>
                            
                            {item.intervention.status === 'completed' && (
                              <div className="mt-3 p-2 bg-green-50 rounded-md">
                                <p className="text-sm text-green-800">
                                  <CheckCircle className="w-4 h-4 inline mr-1" />
                                  Intervention completed successfully
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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