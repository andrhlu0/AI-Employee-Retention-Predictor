import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, AlertTriangle, Calendar, Activity } from 'lucide-react';
import { api } from '../services/api';

const Dashboard = ({ onEmployeeSelect }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchTrendData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.getDashboard();
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const response = await api.getTrends(30);
      const formattedData = Object.entries(response.data).map(([date, values]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ...values
      }));
      setTrendData(formattedData);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Data for bar chart instead of pie chart
  const riskDistributionData = [
    { 
      name: 'High Risk', 
      value: dashboardData?.stats?.high_risk_count || 0, 
      percentage: ((dashboardData?.stats?.high_risk_count || 0) / (dashboardData?.stats?.total_employees || 1) * 100).toFixed(1)
    },
    { 
      name: 'Medium Risk', 
      value: 15, 
      percentage: (15 / (dashboardData?.stats?.total_employees || 1) * 100).toFixed(1)
    },
    { 
      name: 'Low Risk', 
      value: (dashboardData?.stats?.total_employees || 0) - (dashboardData?.stats?.high_risk_count || 0) - 15,
      percentage: (((dashboardData?.stats?.total_employees || 0) - (dashboardData?.stats?.high_risk_count || 0) - 15) / (dashboardData?.stats?.total_employees || 1) * 100).toFixed(1)
    }
  ];

  // Custom colors for each bar
  const getBarColor = (name) => {
    switch(name) {
      case 'High Risk': return '#ef4444';
      case 'Medium Risk': return '#f59e0b';
      case 'Low Risk': return '#10b981';
      default: return '#8b5cf6';
    }
  };

  // Custom bar shape with rounded corners
  const CustomBar = (props) => {
    const { fill, x, y, width, height } = props;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
      </g>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.stats?.total_employees || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-red-600">
                {dashboardData?.stats?.high_risk_count || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Need immediate attention</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {((dashboardData?.stats?.avg_risk_score || 0) * 100).toFixed(1)}%
              </p>
              <div className="flex items-center mt-1">
                {dashboardData?.stats?.avg_risk_score > 0.5 ? (
                  <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                )}
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </div>
            <Activity className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Predictions This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.stats?.predictions_this_month || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">85% accuracy rate</p>
            </div>
            <Calendar className="w-8 h-8 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Trends (30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="high_risk" stroke="#ef4444" name="High Risk" strokeWidth={2} />
              <Line type="monotone" dataKey="medium_risk" stroke="#f59e0b" name="Medium Risk" strokeWidth={2} />
              <Line type="monotone" dataKey="low_risk" stroke="#10b981" name="Low Risk" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution Bar Chart (replaced Pie Chart) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={riskDistributionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Number of Employees', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                        <p className="font-semibold">{payload[0].payload.name}</p>
                        <p className="text-sm">Count: {payload[0].value}</p>
                        <p className="text-sm">Percentage: {payload[0].payload.percentage}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="value" 
                shape={CustomBar}
                label={{ position: 'top', fontSize: 12 }}
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* Legend below the chart */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-sm text-gray-600">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Low Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* High Risk Employees Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">High Risk Employees</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Top Risk Factor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData?.high_risk_employees?.slice(0, 5).map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{employee.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-red-600">
                        {(employee.risk_score * 100).toFixed(1)}%
                      </span>
                      <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${employee.risk_score * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {Object.keys(employee.risk_factors || {})[0]?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => onEmployeeSelect(employee)}
                      className="text-primary-600 hover:text-primary-900 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {dashboardData?.recent_alerts?.slice(0, 5).map((alert, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Employee {alert.employee_id} - Risk Score: {(alert.risk_score * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Predicted departure: {alert.departure_window} • 
                    {new Date(alert.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;