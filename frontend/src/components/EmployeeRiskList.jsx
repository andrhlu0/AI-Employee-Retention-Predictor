// Fixed EmployeeRiskList.jsx with proper navigation
// Save this as: frontend/src/components/EmployeeRiskList.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, AlertTriangle, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import axios from 'axios';

const EmployeeRiskList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk_desc');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterAndSortEmployees();
  }, [employees, searchTerm, departmentFilter, riskFilter, sortBy]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // First check localStorage for uploaded employees
      const storedEmployees = localStorage.getItem('employees');
      if (storedEmployees) {
        const employees = JSON.parse(storedEmployees);
        setEmployees(employees);
        setLoading(false);
        return;
      }
      
      // Try API call
      const response = await axios.get('/api/v1/employees');
      setEmployees(response.data);
      
      // Store in localStorage for persistence
      localStorage.setItem('employees', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Use mock data if API fails and no stored data
      const mockData = getMockEmployees();
      setEmployees(mockData);
      localStorage.setItem('employees', JSON.stringify(mockData));
    } finally {
      setLoading(false);
    }
  };

  const getMockEmployees = () => [
    { id: 1, employee_id: 'EMP001', name: 'John Smith', email: 'john.smith@company.com', position: 'Senior Developer', department: 'Engineering', risk_score: 0.85, last_prediction: new Date().toISOString() },
    { id: 2, employee_id: 'EMP002', name: 'Sarah Johnson', email: 'sarah.j@company.com', position: 'Product Manager', department: 'Product', risk_score: 0.72, last_prediction: new Date().toISOString() },
    { id: 3, employee_id: 'EMP003', name: 'Mike Chen', email: 'mike.chen@company.com', position: 'Data Analyst', department: 'Analytics', risk_score: 0.45, last_prediction: new Date().toISOString() },
    { id: 4, employee_id: 'EMP004', name: 'Emily Davis', email: 'emily.d@company.com', position: 'HR Manager', department: 'HR', risk_score: 0.28, last_prediction: new Date().toISOString() },
    { id: 5, employee_id: 'EMP005', name: 'Alex Rivera', email: 'alex.r@company.com', position: 'Marketing Lead', department: 'Marketing', risk_score: 0.65, last_prediction: new Date().toISOString() },
    { id: 6, employee_id: 'EMP006', name: 'Lisa Wang', email: 'lisa.w@company.com', position: 'DevOps Engineer', department: 'Engineering', risk_score: 0.38, last_prediction: new Date().toISOString() }
  ];

  const filterAndSortEmployees = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase())
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

  // FIX: Add the navigation handler
  const handleViewAnalysis = (employee) => {
    // Navigate to the employee's analysis page
    navigate(`/employees/${employee.employee_id || employee.id}`);
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
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total: {filteredEmployees.length} employees</span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk (75%+)</option>
            <option value="medium">Medium Risk (50-74%)</option>
            <option value="low">Low Risk (&lt;50%)</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="risk_desc">Highest Risk First</option>
            <option value="risk_asc">Lowest Risk First</option>
            <option value="name">Name (A-Z)</option>
            <option value="department">Department</option>
          </select>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
                  <p className="text-sm text-gray-600">{employee.position}</p>
                </div>
                <div className={`px-2 py-1 rounded-full flex items-center gap-1 ${getRiskColor(employee.risk_score)}`}>
                  {getRiskIcon(employee.risk_score)}
                  <span className="text-sm font-medium">
                    {(employee.risk_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium">{employee.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900 truncate ml-2">{employee.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Analysis:</span>
                  <span className="text-gray-900">
                    {employee.last_prediction ? 
                      new Date(employee.last_prediction).toLocaleDateString() : 
                      'Never'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  {/* FIX: Changed from just a button to one with onClick handler */}
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