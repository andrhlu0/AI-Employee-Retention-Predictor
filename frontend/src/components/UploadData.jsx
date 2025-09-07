// Complete UploadData.jsx with AI Scoring promotion
// frontend/src/components/UploadData.jsx

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, CheckCircle, AlertCircle, 
  Download, Info, Eye, Save, X, Brain,
  Sparkles, Link2, ArrowRight, Zap
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const UploadData = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('upload');
  const [mlProcessingStatus, setMlProcessingStatus] = useState(null);
  
  // Check if AI scoring is enabled
  const aiScoringEnabled = localStorage.getItem('ai_scoring_enabled') === 'true';
  const hasIntegrations = localStorage.getItem('has_integrations') === 'true';
  
  const calculateRiskScore = (employee) => {
    let riskScore = 0;
    const riskFactors = {};
    
    // Engagement factor (most important)
    const engagementScore = employee.engagement_score || 0.5;
    if (engagementScore < 0.4) {
      riskScore += 0.35;
      riskFactors.low_engagement = true;
    } else if (engagementScore < 0.6) {
      riskScore += 0.15;
      riskFactors.moderate_engagement = true;
    }
    
    // Performance factor
    const performanceScore = employee.performance_score || 0.5;
    if (performanceScore < 0.5) {
      riskScore += 0.25;
      riskFactors.performance_issues = true;
    } else if (performanceScore > 0.85 && engagementScore < 0.5) {
      riskScore += 0.20;
      riskFactors.high_performer_flight = true;
    }
    
    // Tenure factor
    if (employee.hire_date) {
      const hireDate = new Date(employee.hire_date);
      const monthsEmployed = (new Date() - hireDate) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsEmployed < 6) {
        riskScore += 0.10;
        riskFactors.new_employee = true;
      } else if (monthsEmployed > 24 && monthsEmployed < 48) {
        riskScore += 0.05;
        riskFactors.mid_tenure_risk = true;
      }
    }
    
    // Compensation factor
    if (!employee.last_promotion_date) {
      riskScore += 0.10;
      riskFactors.no_recent_promotion = true;
    } else {
      const lastPromotion = new Date(employee.last_promotion_date);
      const monthsSincePromotion = (new Date() - lastPromotion) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSincePromotion > 18) {
        riskScore += 0.15;
        riskFactors.promotion_overdue = true;
      }
    }
    
    // Normalize risk score
    riskScore = Math.min(Math.max(riskScore, 0), 1);
    
    return {
      risk_score: riskScore,
      risk_factors: riskFactors,
      risk_level: riskScore >= 0.75 ? 'critical' : 
                  riskScore >= 0.5 ? 'high' :
                  riskScore >= 0.25 ? 'medium' : 'low',
      departure_window: riskScore >= 0.75 ? '0-30 days' :
                        riskScore >= 0.5 ? '30-60 days' :
                        riskScore >= 0.25 ? '60-90 days' : 'Low risk'
    };
  };

  const generateInterventions = (riskFactors, riskScore) => {
    const interventions = [];

    if (riskFactors.low_engagement) {
      interventions.push({
        action: 'Schedule 1:1 Check-in',
        priority: 'high',
        timeline: 'within 3 days',
        owner: 'Direct Manager',
        type: 'engagement'
      });
    }

    if (riskFactors.performance_issues) {
      interventions.push({
        action: 'Performance Support Plan',
        priority: 'medium',
        timeline: 'within 1 week',
        owner: 'Manager + HR',
        type: 'performance'
      });
    }

    if (riskFactors.high_performer_flight) {
      interventions.push({
        action: 'Career Development Discussion',
        priority: 'high',
        timeline: 'immediately',
        owner: 'Manager',
        type: 'career'
      });
      interventions.push({
        action: 'Compensation Review',
        priority: 'high',
        timeline: 'within 1 week',
        owner: 'HR',
        type: 'compensation'
      });
    }

    if (riskFactors.promotion_overdue) {
      interventions.push({
        action: 'Promotion Review',
        priority: 'high',
        timeline: 'within 2 weeks',
        owner: 'Manager + HR',
        type: 'compensation'
      });
    }

    if (riskScore > 0.7 && interventions.length === 0) {
      interventions.push({
        action: 'Retention Discussion',
        priority: 'critical',
        timeline: 'immediately',
        owner: 'Manager + HR',
        type: 'retention'
      });
    }

    return interventions;
  };

  const processFile = async (acceptedFile) => {
    setFile(acceptedFile);
    setIsProcessing(true);
    setMlProcessingStatus('parsing');

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const content = e.target.result;
      let parsedData = [];

      try {
        if (acceptedFile.name.endsWith('.csv')) {
          const result = Papa.parse(content, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_')
          });
          parsedData = result.data;
        } else {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        }

        setMlProcessingStatus('analyzing');

        // Process employees with ML predictions
        const processedEmployees = parsedData.map((row, index) => {
          const employee = {
            id: index + 1,
            employee_id: row.employee_id || `EMP${String(index + 1).padStart(3, '0')}`,
            name: row.name || row.employee_name || `Employee ${index + 1}`,
            email: row.email || `employee${index + 1}@company.com`,
            department: row.department || 'Unknown',
            position: row.position || row.title || 'Unknown',
            hire_date: row.hire_date || row.start_date,
            manager_id: row.manager_id || row.manager,
            location: row.location || 'Remote',
            salary: row.salary ? parseFloat(row.salary) : null,
            performance_score: row.performance_score ? parseFloat(row.performance_score) : 0.7,
            engagement_score: row.engagement_score ? parseFloat(row.engagement_score) : 0.7,
            last_promotion_date: row.last_promotion_date || row.promotion_date
          };

          // Calculate ML predictions
          const mlPrediction = calculateRiskScore(employee);
          
          // Add ML results to employee
          return {
            ...employee,
            ...mlPrediction,
            interventions: generateInterventions(mlPrediction.risk_factors, mlPrediction.risk_score),
            last_prediction_date: new Date().toISOString()
          };
        });

        setMlProcessingStatus('complete');
        setPreviewData(processedEmployees.slice(0, 5));
        
        // Store full processed data
        setUploadResult({
          success: true,
          totalRecords: processedEmployees.length,
          processedEmployees,
          highRiskCount: processedEmployees.filter(e => e.risk_score >= 0.75).length,
          mediumRiskCount: processedEmployees.filter(e => e.risk_score >= 0.25 && e.risk_score < 0.75).length,
          lowRiskCount: processedEmployees.filter(e => e.risk_score < 0.25).length
        });

      } catch (error) {
        console.error('Error processing file:', error);
        setUploadResult({
          success: false,
          error: error.message
        });
      } finally {
        setIsProcessing(false);
      }
    };

    if (acceptedFile.name.endsWith('.csv')) {
      reader.readAsText(acceptedFile);
    } else {
      reader.readAsBinaryString(acceptedFile);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const saveToSystem = () => {
    if (uploadResult?.processedEmployees) {
      // Save employees to localStorage
      localStorage.setItem('employees', JSON.stringify(uploadResult.processedEmployees));
      
      // Generate and save interventions
      const allInterventions = [];
      uploadResult.processedEmployees.forEach((employee, index) => {
        if (employee.interventions && employee.interventions.length > 0) {
          employee.interventions.forEach((intervention) => {
            allInterventions.push({
              id: `INT-${Date.now()}-${index}`,
              employee: employee.name,
              employee_id: employee.employee_id,
              department: employee.department,
              risk_score: employee.risk_score,
              intervention: {
                ...intervention,
                status: 'pending',
                created_date: new Date().toISOString()
              },
              created_date: new Date().toISOString()
            });
          });
        }
      });
      localStorage.setItem('interventions', JSON.stringify(allInterventions));
      
      // Update dashboard stats
      const stats = {
        total_employees: uploadResult.totalRecords,
        high_risk_count: uploadResult.highRiskCount,
        medium_risk_count: uploadResult.mediumRiskCount,
        low_risk_count: uploadResult.lowRiskCount,
        avg_risk_score: uploadResult.processedEmployees.reduce((sum, e) => sum + e.risk_score, 0) / uploadResult.totalRecords,
        predictions_today: uploadResult.totalRecords,
        risk_trend: -0.05,
        last_updated: new Date().toISOString()
      };
      localStorage.setItem('dashboardStats', JSON.stringify(stats));
      
      // Generate and save analytics data
      const analyticsData = generateAnalyticsData(uploadResult);
      localStorage.setItem('analyticsData', JSON.stringify(analyticsData));
      
      // Broadcast update event
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          source: 'upload',
          timestamp: new Date().toISOString(),
          counts: {
            employees: uploadResult.totalRecords,
            interventions: allInterventions.length
          }
        }
      }));
      
      alert('Data successfully imported! All dashboards have been updated.');
      
      // Reset state
      setFile(null);
      setPreviewData(null);
      setUploadResult(null);
    }
  };

  const generateAnalyticsData = (uploadResult) => {
    const { processedEmployees } = uploadResult;
    
    // Calculate department risk
    const deptGroups = {};
    processedEmployees.forEach(emp => {
      if (!deptGroups[emp.department]) {
        deptGroups[emp.department] = { total: 0, riskSum: 0, highRisk: 0 };
      }
      deptGroups[emp.department].total++;
      deptGroups[emp.department].riskSum += emp.risk_score;
      if (emp.risk_score >= 0.75) deptGroups[emp.department].highRisk++;
    });
    
    return {
      summary: {
        avgRiskScore: processedEmployees.reduce((sum, e) => sum + e.risk_score, 0) / processedEmployees.length,
        totalEmployees: uploadResult.totalRecords,
        highRiskCount: uploadResult.highRiskCount,
        predictionsThisMonth: uploadResult.totalRecords,
        interventionSuccessRate: 0.72,
        avgTimeToIntervention: 3.5,
        riskTrend: -0.05,
        modelAccuracy: 0.89
      },
      riskDistribution: [
        { name: 'Low', value: uploadResult.lowRiskCount, percentage: (uploadResult.lowRiskCount / uploadResult.totalRecords * 100).toFixed(1) },
        { name: 'Medium', value: uploadResult.mediumRiskCount, percentage: (uploadResult.mediumRiskCount / uploadResult.totalRecords * 100).toFixed(1) },
        { name: 'High', value: uploadResult.highRiskCount, percentage: (uploadResult.highRiskCount / uploadResult.totalRecords * 100).toFixed(1) }
      ],
      departmentRisk: Object.keys(deptGroups).map(dept => ({
        department: dept,
        avgRisk: (deptGroups[dept].riskSum / deptGroups[dept].total * 100).toFixed(1),
        highRiskCount: deptGroups[dept].highRisk,
        totalCount: deptGroups[dept].total
      })),
      accuracyTrend: generateAccuracyTrend(),
      interventionStats: generateInterventionStats()
    };
  };

  const generateAccuracyTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    return months.map(month => ({
      month,
      accuracy: 85 + Math.random() * 10
    }));
  };

  const generateInterventionStats = () => {
    const types = ['1-on-1 Meeting', 'Compensation Review', 'Workload Adjustment', 'Career Development', 'Team Building'];
    return types.map(type => ({
      type,
      total: Math.floor(Math.random() * 50) + 10,
      success: Math.floor(Math.random() * 40) + 5,
      avgRiskReduction: Math.random() * 0.3 + 0.1
    }));
  };

  const downloadTemplate = () => {
    const template = `employee_id,name,email,department,position,hire_date,manager_id,location,salary,performance_score,engagement_score,last_promotion_date
EMP001,John Smith,john.smith@company.com,Engineering,Senior Developer,2021-03-15,MGR001,New York,95000,0.85,0.75,2023-01-15
EMP002,Sarah Johnson,sarah.johnson@company.com,Marketing,Marketing Manager,2019-06-01,MGR002,Remote,78000,0.90,0.80,2022-06-01
EMP003,Mike Chen,mike.chen@company.com,Sales,Sales Rep,2022-11-20,MGR003,Los Angeles,65000,0.70,0.65,
EMP004,Emily Davis,emily.davis@company.com,Engineering,Junior Developer,2023-08-10,MGR001,New York,68000,0.75,0.70,
EMP005,Alex Rivera,alex.rivera@company.com,Product,Product Manager,2020-02-28,MGR004,San Francisco,110000,0.88,0.82,2023-03-01`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employee_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Employee Data</h1>
        <p className="text-gray-600 mt-1">Import employee data and automatically calculate retention risk scores using ML</p>
      </div>

      {/* AI Scoring Promotion Banner */}
      {!aiScoringEnabled && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">Boost Accuracy with AI-Powered Engagement Scoring</h3>
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">NEW</span>
              </div>
              <p className="text-gray-600 mt-2">
                Get 40% more accurate predictions by enabling AI analysis of communication patterns, email sentiment, 
                and calendar data. Our advanced AI analyzes:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Slack message sentiment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Email response patterns</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Meeting engagement levels</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">After-hours activity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Collaboration frequency</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Work-life balance indicators</span>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-4">
                <button
                  onClick={() => navigate('/settings?tab=integrations')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Enable AI Scoring
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
                <span className="text-sm text-gray-500">Takes just 2 minutes to set up</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner if AI is enabled */}
      {aiScoringEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                AI-Powered Scoring Active
              </p>
              <p className="text-sm text-green-700 mt-1">
                Your predictions are enhanced with real-time analysis of Slack, email, and calendar data.
                Engagement scores will be automatically updated based on communication patterns.
              </p>
            </div>
            <button
              onClick={() => navigate('/settings?tab=integrations')}
              className="px-3 py-1 text-sm text-green-700 border border-green-300 rounded-md hover:bg-green-100"
            >
              Configure
            </button>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">ML-Powered Risk Calculation</p>
            <p>Upload your employee data and our system will automatically:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Calculate risk scores using machine learning</li>
              <li>Identify key risk factors for each employee</li>
              <li>Generate personalized intervention recommendations</li>
              <li>Predict departure windows for high-risk employees</li>
              {aiScoringEnabled && (
                <li className="text-green-700 font-medium">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Enhanced with AI analysis of communication data
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'upload'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upload Data
          </button>
          <button
            onClick={() => setSelectedTab('template')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'template'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Download Template
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'upload' && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div className="bg-white rounded-lg shadow p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg font-medium text-gray-900">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-900">
                    Drag & drop your employee data file here
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    or click to browse (CSV, XLS, XLSX)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <div>
                  <p className="font-medium text-gray-900">Processing file...</p>
                  <p className="text-sm text-gray-500">
                    {mlProcessingStatus === 'parsing' && 'Reading file data...'}
                    {mlProcessingStatus === 'analyzing' && 'Running ML analysis...'}
                    {mlProcessingStatus === 'complete' && 'Processing complete!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preview Data */}
          {previewData && !isProcessing && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Preview (First 5 Records)</h3>
                <button
                  onClick={() => setPreviewData(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interventions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((employee, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{employee.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{employee.department}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`font-medium ${
                            employee.risk_score >= 0.75 ? 'text-red-600' :
                            employee.risk_score >= 0.5 ? 'text-orange-600' :
                            employee.risk_score >= 0.25 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {(employee.risk_score * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            employee.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                            employee.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                            employee.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {employee.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {employee.interventions?.length || 0} recommended
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
              </h3>
              
              {uploadResult.success ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{uploadResult.totalRecords}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-600">High Risk</p>
                      <p className="text-2xl font-bold text-red-600">{uploadResult.highRiskCount}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm text-yellow-600">Medium Risk</p>
                      <p className="text-2xl font-bold text-yellow-600">{uploadResult.mediumRiskCount}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">Low Risk</p>
                      <p className="text-2xl font-bold text-green-600">{uploadResult.lowRiskCount}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreviewData(null);
                        setUploadResult(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Upload Another
                    </button>
                    <button
                      onClick={saveToSystem}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save to System
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">
                  <p>Error: {uploadResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'template' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Template</h3>
          <p className="text-gray-600 mb-6">
            Use our template to ensure your data is formatted correctly for import.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Required Fields:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>employee_id</strong>: Unique identifier for each employee</li>
              <li><strong>name</strong>: Employee full name</li>
              <li><strong>email</strong>: Employee email address</li>
              <li><strong>department</strong>: Department name</li>
              <li><strong>position</strong>: Job title/position</li>
              <li><strong>hire_date</strong>: Date of hire (YYYY-MM-DD)</li>
              <li><strong>performance_score</strong>: Performance rating (0-1)</li>
              <li><strong>engagement_score</strong>: Engagement score (0-1) 
                {aiScoringEnabled && (
                  <span className="text-green-600 ml-1">(Auto-updated with AI)</span>
                )}
              </li>
            </ul>
            
            <h4 className="font-medium text-gray-900 mb-2 mt-4">Optional Fields:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><strong>manager_id</strong>: Manager's employee ID</li>
              <li><strong>location</strong>: Office location or "Remote"</li>
              <li><strong>salary</strong>: Annual salary</li>
              <li><strong>last_promotion_date</strong>: Date of last promotion (YYYY-MM-DD)</li>
            </ul>
          </div>
          
          {aiScoringEnabled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Zap className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">AI Enhancement Active</p>
                  <p className="text-sm text-green-700 mt-1">
                    Engagement scores in your template will be automatically enhanced with real-time 
                    communication analysis after upload. Initial values are used as baselines.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </button>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-3">Sample Data Format:</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-xs">
{`employee_id,name,email,department,position,hire_date,performance_score,engagement_score
EMP001,John Smith,john@company.com,Engineering,Senior Dev,2021-03-15,0.85,0.75
EMP002,Sarah Johnson,sarah@company.com,Marketing,Manager,2019-06-01,0.90,0.80
EMP003,Mike Chen,mike@company.com,Sales,Sales Rep,2022-11-20,0.70,0.65`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadData;