import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '../services/api';

const EmployeeRiskList = ({ onEmployeeSelect }) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [sortBy, setSortBy] = useState('risk_desc');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterAndSortEmployees();
  }, [employees, searchTerm, filterDepartment, filterRisk, sortBy]);

  const fetchEmployees = async () => {
    try {
      const response = await api.getEmployees();
      setEmployees(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setLoading(false);
    }
  };

  const filterAndSortEmployees = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === filterDepartment);
    }

    // Risk filter
    if (filterRisk !== 'all') {
      switch (filterRisk) {
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Risk Level Filter */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk (≥75%)</option>
            <option value="medium">Medium Risk (50-74%)</option>
            <option value="low">Low Risk (&lt;50%)</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
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
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onEmployeeSelect(employee)}
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
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
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