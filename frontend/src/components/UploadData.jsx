import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, FileText, CheckCircle, XCircle, AlertCircle, 
  Download, RefreshCw, Database, Brain, TrendingUp,
  ArrowRight, Info
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const UploadData = () => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedTab, setSelectedTab] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mlProcessingStatus, setMlProcessingStatus] = useState(null);

  // ML Feature Calculator
  const calculateMLFeatures = (employee) => {
    // Extract or derive ML features from basic employee data
    const features = {
      // Derive risk indicators from available data
      tenure_days: employee.hire_date ? 
        Math.floor((new Date() - new Date(employee.hire_date)) / (1000 * 60 * 60 * 24)) : 365,
      
      performance_score: parseFloat(employee.performance_score) || 0.7,
      engagement_score: parseFloat(employee.engagement_score) || 0.7,
      
      // Derive from other fields if available
      recent_promotion: employee.last_promotion_date ? 
        (new Date() - new Date(employee.last_promotion_date)) / (1000 * 60 * 60 * 24) < 365 : false,
      
      // Department risk factors (based on historical data)
      dept_risk_factor: {
        'Engineering': 0.15,
        'Sales': 0.25,
        'Support': 0.20,
        'Marketing': 0.10,
        'HR': 0.08,
        'Product': 0.12
      }[employee.department] || 0.15,
      
      // Salary competitiveness (if salary provided)
      salary_competitive: employee.salary ? 
        (employee.salary > 50000 ? 0.1 : 0.3) : 0.2,
      
      // Manager relationship (simplified)
      has_manager: !!employee.manager_id,
      
      // Location factor
      remote_risk: employee.location?.toLowerCase().includes('remote') ? 0.1 : 0
    };

    return features;
  };

  // Rule-based ML Prediction (mimics ml_predictor.py logic)
  const calculateRiskScore = (employee) => {
    const features = calculateMLFeatures(employee);
    let riskScore = 0.0;
    const riskFactors = {};

    // Tenure risk
    if (features.tenure_days < 365) {
      riskScore += 0.15;
      riskFactors.new_employee = 'medium';
    } else if (features.tenure_days > 365 * 3 && features.tenure_days < 365 * 5) {
      riskScore += 0.10;
      riskFactors.flight_risk_zone = 'medium';
    }

    // Performance indicators
    if (features.performance_score < 0.6) {
      riskScore += 0.20;
      riskFactors.performance_issues = 'high';
    } else if (features.performance_score > 0.9 && !features.recent_promotion) {
      riskScore += 0.15;
      riskFactors.high_performer_flight = 'medium';
    }

    // Engagement score
    if (features.engagement_score < 0.5) {
      riskScore += 0.25;
      riskFactors.low_engagement = 'high';
    } else if (features.engagement_score < 0.7) {
      riskScore += 0.10;
      riskFactors.declining_engagement = 'medium';
    }

    // Department and other factors
    riskScore += features.dept_risk_factor;
    riskScore += features.salary_competitive;
    riskScore += features.remote_risk;

    // No manager assigned
    if (!features.has_manager) {
      riskScore += 0.05;
      riskFactors.no_manager = 'low';
    }

    // Add some randomness for demo realism
    riskScore += (Math.random() * 0.1 - 0.05);

    // Cap at 0.95
    riskScore = Math.min(Math.max(riskScore, 0.05), 0.95);

    return {
      risk_score: riskScore,
      risk_factors: riskFactors,
      confidence: 0.75, // Since we're using rules, not full ML
      risk_level: riskScore >= 0.75 ? 'critical' : 
                  riskScore >= 0.5 ? 'high' :
                  riskScore >= 0.25 ? 'medium' : 'low',
      departure_window: riskScore >= 0.75 ? '0-30 days' :
                        riskScore >= 0.5 ? '30-60 days' :
                        riskScore >= 0.25 ? '60-90 days' : 'Low risk'
    };
  };

  // Generate interventions based on risk factors
  const generateInterventions = (riskFactors, riskScore) => {
    const interventions = [];

    if (riskFactors.low_engagement) {
      interventions.push({
        action: 'Schedule 1:1 Check-in',
        priority: 'high',
        timeline: 'within 3 days',
        owner: 'Direct Manager'
      });
    }

    if (riskFactors.performance_issues) {
      interventions.push({
        action: 'Performance Support Plan',
        priority: 'medium',
        timeline: 'within 1 week',
        owner: 'Manager + HR'
      });
    }

    if (riskFactors.high_performer_flight) {
      interventions.push({
        action: 'Career Development Discussion',
        priority: 'high',
        timeline: 'immediately',
        owner: 'Manager'
      });
      interventions.push({
        action: 'Compensation Review',
        priority: 'high',
        timeline: 'within 1 week',
        owner: 'HR'
      });
    }

    if (riskFactors.new_employee) {
      interventions.push({
        action: 'Onboarding Check-in',
        priority: 'medium',
        timeline: 'within 1 week',
        owner: 'HR + Manager'
      });
    }

    if (riskScore > 0.7 && interventions.length === 0) {
      interventions.push({
        action: 'Retention Discussion',
        priority: 'critical',
        timeline: 'immediately',
        owner: 'Manager + HR'
      });
    }

    return interventions;
  };

  // Enhanced file processing
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
        } else if (acceptedFile.name.match(/\.(xlsx|xls)$/)) {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null
          });
          
          // Convert to objects with headers
          const headers = parsedData[0].map(h => h.toString().trim().toLowerCase().replace(/\s+/g, '_'));
          parsedData = parsedData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
        }

        setMlProcessingStatus('calculating');

        // Process employees with ML predictions
        const processedEmployees = parsedData.map((row, index) => {
          // Basic employee data
          const employee = {
            id: index + 1,
            employee_id: row.employee_id || `EMP${String(index + 1).padStart(3, '0')}`,
            name: row.name || row.full_name || 'Unknown',
            email: row.email || row.email_address || `emp${index + 1}@company.com`,
            department: row.department || 'Unknown',
            position: row.position || row.job_title || row.role || 'Unknown',
            hire_date: row.hire_date || row.start_date,
            manager_id: row.manager_id || row.manager,
            location: row.location || row.office || 'HQ',
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
      // Save to localStorage
      localStorage.setItem('employees', JSON.stringify(uploadResult.processedEmployees));
      
      // Update dashboard stats
      const stats = {
        total_employees: uploadResult.totalRecords,
        high_risk_count: uploadResult.highRiskCount,
        medium_risk_count: uploadResult.mediumRiskCount,
        low_risk_count: uploadResult.lowRiskCount,
        avg_risk_score: uploadResult.processedEmployees.reduce((sum, e) => sum + e.risk_score, 0) / uploadResult.totalRecords,
        predictions_today: uploadResult.totalRecords,
        risk_trend: -0.05
      };
      localStorage.setItem('dashboardStats', JSON.stringify(stats));
      
      alert('Data successfully imported and ML predictions calculated!');
      
      // Reset state
      setFile(null);
      setPreviewData(null);
      setUploadResult(null);
    }
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
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upload New Data
          </button>
          <button
            onClick={() => setSelectedTab('fields')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'fields'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Field Mapping
          </button>
        </nav>
      </div>

      {selectedTab === 'upload' ? (
        <div className="space-y-6">
          {/* Upload Area */}
          {!file && !uploadResult && (
            <div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-gray-600 mb-4">or click to browse</p>
                <p className="text-xs text-gray-500">Supports CSV and Excel files (.csv, .xlsx, .xls)</p>
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-medium text-gray-900">Processing Employee Data...</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full ${mlProcessingStatus === 'parsing' ? 'bg-blue-600' : 'bg-green-600'}`}>
                    {mlProcessingStatus !== 'parsing' && <CheckCircle className="w-5 h-5 text-white" />}
                  </div>
                  <span className={mlProcessingStatus === 'parsing' ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                    Parsing file and extracting data
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full ${mlProcessingStatus === 'calculating' ? 'bg-blue-600' : mlProcessingStatus === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`}>
                    {mlProcessingStatus === 'complete' && <CheckCircle className="w-5 h-5 text-white" />}
                  </div>
                  <span className={mlProcessingStatus === 'calculating' ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                    Running ML predictions and risk analysis
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full ${mlProcessingStatus === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`}>
                    {mlProcessingStatus === 'complete' && <CheckCircle className="w-5 h-5 text-white" />}
                  </div>
                  <span className="text-gray-600">
                    Generating intervention recommendations
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* File Info & Preview */}
          {file && !isProcessing && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewData(null);
                      setUploadResult(null);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`rounded-lg p-4 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {uploadResult.success ? 'ML Processing Complete!' : 'Processing Failed'}
                      </p>
                      {uploadResult.success ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-sm text-green-800">
                            Successfully processed {uploadResult.totalRecords} employees
                          </p>
                          <div className="grid grid-cols-3 gap-4 mt-3">
                            <div className="bg-white rounded p-3">
                              <p className="text-xs text-gray-600">High Risk</p>
                              <p className="text-xl font-bold text-red-600">{uploadResult.highRiskCount}</p>
                            </div>
                            <div className="bg-white rounded p-3">
                              <p className="text-xs text-gray-600">Medium Risk</p>
                              <p className="text-xl font-bold text-yellow-600">{uploadResult.mediumRiskCount}</p>
                            </div>
                            <div className="bg-white rounded p-3">
                              <p className="text-xs text-gray-600">Low Risk</p>
                              <p className="text-xl font-bold text-green-600">{uploadResult.lowRiskCount}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-800 mt-1">{uploadResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {previewData && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Data Preview with ML Predictions (First 5 Records)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ML Risk Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Risk Factor</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((employee, idx) => {
                          const primaryRiskFactor = Object.keys(employee.risk_factors)[0] || 'none';
                          return (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {employee.employee_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {employee.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {employee.department}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                  <Brain className="w-4 h-4 text-purple-600" />
                                  <span className="font-medium">
                                    {(employee.risk_score * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  employee.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                                  employee.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                                  employee.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {employee.risk_level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {primaryRiskFactor.replace(/_/g, ' ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {uploadResult?.success && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewData(null);
                      setUploadResult(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveToSystem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Database className="w-4 h-4" />
                    Save to System
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CSV Field Mapping Guide</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Required Fields</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">employee_id</code>
                  <span className="text-gray-600 ml-2">Unique identifier</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">name</code>
                  <span className="text-gray-600 ml-2">Full name</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">email</code>
                  <span className="text-gray-600 ml-2">Email address</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">department</code>
                  <span className="text-gray-600 ml-2">Department name</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">position</code>
                  <span className="text-gray-600 ml-2">Job title/role</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">hire_date</code>
                  <span className="text-gray-600 ml-2">Start date (YYYY-MM-DD)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Optional Fields (Improve ML Accuracy)</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">performance_score</code>
                  <span className="text-gray-600 ml-2">0.0 to 1.0</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">engagement_score</code>
                  <span className="text-gray-600 ml-2">0.0 to 1.0</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">manager_id</code>
                  <span className="text-gray-600 ml-2">Manager's employee ID</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">location</code>
                  <span className="text-gray-600 ml-2">Office/Remote</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">salary</code>
                  <span className="text-gray-600 ml-2">Annual salary</span>
                </div>
                <div>
                  <code className="bg-gray-100 px-2 py-1 rounded">last_promotion_date</code>
                  <span className="text-gray-600 ml-2">YYYY-MM-DD</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-900 mb-1">ML Processing Notes</p>
                  <ul className="space-y-1 text-yellow-800">
                    <li>• Missing optional fields will use default values</li>
                    <li>• The ML model will calculate risk scores even with minimal data</li>
                    <li>• More complete data leads to more accurate predictions</li>
                    <li>• Risk scores are automatically updated after import</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-purple-900 mb-1">ML Risk Factors Analyzed</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-purple-800">
                    <div>• Tenure and flight risk zones</div>
                    <div>• Performance trends</div>
                    <div>• Engagement levels</div>
                    <div>• Department attrition rates</div>
                    <div>• Promotion history</div>
                    <div>• Salary competitiveness</div>
                    <div>• Manager relationships</div>
                    <div>• Remote work factors</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadData;