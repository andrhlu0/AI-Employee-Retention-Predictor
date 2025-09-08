// Fixed EmployeeRiskList.jsx - COMPLETE FILE
// Save this as: frontend/src/components/EmployeeRiskList.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Search, Filter, RefreshCw } from 'lucide-react';
import axios from 'axios';

const EmployeeRiskList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk_desc');

  useEffect(() => {
    fetchEmployees();
    
    // Listen for data updates from upload
    const handleDataUpdate = () => {
      fetchEmployees();
    };
    
    window.addEventListener('dataUpdated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('dataUpdated', handleDataUpdate);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchQuery, departmentFilter, riskFilter, sortBy]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // First check localStorage for employees
      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) {
        const employees = JSON.parse(storedEmployees);
        setEmployees(employees);
        setLoading(false);
        return;
      }
      
      // Try API call
      try {
        const response = await axios.get('/api/v1/employees');
        setEmployees(response.data);
        localStorage.setItem('employees', JSON.stringify(response.data));
      } catch (apiError) {
        // Use mock data if no stored data and API fails
        const mockEmployees = generateMockEmployees();
        setEmployees(mockEmployees);
        localStorage.setItem('employees', JSON.stringify(mockEmployees));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Fallback to mock data
      const mockEmployees = generateMockEmployees();
      setEmployees(mockEmployees);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockEmployees = () => {
    const departments = ['Engineering', 'Sales', 'Marketing', 'Product', 'HR', 'Operations'];
    const positions = ['Manager', 'Senior Developer', 'Sales Rep', 'Marketing Specialist', 'Product Manager', 'HR Specialist'];
    const names = [
      'John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Davis', 'Alex Rivera',
      'Jessica Wong', 'David Martinez', 'Lisa Anderson', 'Robert Taylor', 'Maria Garcia',
      'James Wilson', 'Jennifer Lee', 'Michael Brown', 'Amanda Clark', 'Chris Rodriguez'
    ];
    
    return names.map((name, index) => ({
      id: index + 1,
      employee_id: `EMP${String(index + 1).padStart(5, '0')}`,
      name: name,
      email: `${name.toLowerCase().replace(' ', '.')}@company.com`,
      department: departments[index % departments.length],
      position: positions[index % positions.length],
      risk_score: Math.random() * 0.9 + 0.1,
      tenure_years: Math.floor(Math.random() * 10) + 1,
      last_promotion: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3).toISOString(),
      manager: 'John Manager',
      risk_factors: {
        burnout_risk: Math.random() > 0.5 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
        low_engagement: Math.random() > 0.5 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
        negative_sentiment: Math.random() > 0.5 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
        social_isolation: Math.random() > 0.5 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low'
      },
      last_prediction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const applyFilters = () => {
    let filtered = [...employees];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    // Risk filter
    if (riskFilter !== 'all') {
      switch (riskFilter) {
        case 'high':
          filtered = filtered.filter(emp => emp.risk_score >= 0.75);
          break;
        case 'medium':
          filtered = filtered.filter(emp => emp.risk_score >= 0.5 && emp.risk_score < 0.75);
          break;
        case 'low':
          filtered = filtered.filter(emp => emp.risk_score < 0.5);
          break;
      }
    }

    // Sort
    switch (sortBy) {
      case 'risk_desc':
        filtered.sort((a, b) => b.risk_score - a.risk_score);
        break;
      case 'risk_asc':
        filtered.sort((a, b) => a.risk_score - b.risk_score);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'department':
        filtered.sort((a, b) => a.department.localeCompare(b.department));
        break;
    }

    setFilteredEmployees(filtered);
  };

  const getRiskColor = (score) => {
    if (score >= 0.75) return 'text-red-600 bg-red-100';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getRiskIcon = (score) => {
    if (score >= 0.75) return <TrendingUp className="w-4 h-4" />;
    if (score >= 0.5) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  // Navigation handler - ensure we're passing the correct ID
  const handleViewAnalysis = (employee) => {
    // Store employee data in localStorage for the RiskAnalysis component
    const storedEmployees = localStorage.getItem('employees') || '[]';
    const employees = JSON.parse(storedEmployees);
    const updatedEmployees = [...employees.filter(e => e.id !== employee.id), employee];
    localStorage.setItem('employees', JSON.stringify(updatedEmployees));
    
    // Navigate to the employee's analysis page
    const employeeId = employee.employee_id || employee.id;
    console.log('Navigating to employee:', employeeId, employee.name);
    navigate(`/employees/${employeeId}`);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const departments = [...new Set(employees.map(emp => emp.department))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Employee Risk Analysis</h2>
            <p className="text-gray-600 mt-1">Monitor and manage retention risks across your organization</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk (≥75%)</option>
            <option value="medium">Medium Risk (50-74%)</option>
            <option value="low">Low Risk (&lt;50%)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="risk_desc">Risk Score (High to Low)</option>
            <option value="risk_asc">Risk Score (Low to High)</option>
            <option value="name">Name (A-Z)</option>
            <option value="department">Department</option>
          </select>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {employee.position} • {employee.department}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ID: {employee.employee_id}
                  </p>
                </div>
                <div className="ml-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(employee.risk_score)}`}>
                    {getRiskIcon(employee.risk_score)}
                    <span className="ml-1">{(employee.risk_score * 100).toFixed(0)}%</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Risk Level:</span>
                  <span className="font-medium">
                    {employee.risk_score >= 0.75 ? 'High' : 
                     employee.risk_score >= 0.5 ? 'Medium' : 'Low'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Analysis:</span>
                  <span className="text-gray-700">
                    {employee.last_prediction ? 
                      new Date(employee.last_prediction).toLocaleDateString() : 
                      'Never'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => handleViewAnalysis(employee)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
                  >
                    View Analysis →
                  </button>
                  {employee.risk_score >= 0.75 && (
                    <span className="flex items-center text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Needs attention
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No employees found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeRiskList;