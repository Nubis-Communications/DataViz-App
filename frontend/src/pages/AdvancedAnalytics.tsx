import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Paper,
  Tabs,
  Tab,
  Slider,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  DataUsage as DataUsageIcon,
  ShowChart as ChartIcon,
  TableChart as TableIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  BubbleChart as BubbleIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Dataset {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  data_types: Record<string, string>;
  summary_stats: Record<string, any>;
}

interface StatisticalAnalysis {
  basic_stats: Record<string, any>;
  correlation_matrix: Record<string, any>;
  data_quality: DataQualityReport;
  outliers: OutlierAnalysis;
  trends: TrendAnalysis;
  insights: string[];
}

interface DataQualityReport {
  overall_score: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  issues: DataIssue[];
  recommendations: string[];
}

interface DataIssue {
  type: 'missing' | 'duplicate' | 'outlier' | 'inconsistent' | 'invalid';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_columns: string[];
  affected_rows: number;
  suggestion: string;
}

interface OutlierAnalysis {
  method: string;
  threshold: number;
  outliers: Record<string, any[]>;
  summary: Record<string, any>;
}

interface TrendAnalysis {
  temporal_columns: string[];
  trends: Record<string, any>;
  seasonality: Record<string, any>;
  forecasts: Record<string, any>;
}

const AdvancedAnalytics: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [datasetInfo, setDatasetInfo] = useState<Dataset | null>(null);
  const [analysis, setAnalysis] = useState<StatisticalAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [analysisConfig, setAnalysisConfig] = useState({
    include_correlations: true,
    outlier_detection: true,
    trend_analysis: true,
    data_quality: true,
    confidence_level: 0.95,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      fetchDatasetInfo(selectedDataset);
    }
  }, [selectedDataset]);

  const fetchDatasets = async () => {
    try {
      const response = await axios.get('/datasets');
      setDatasets(response.data.datasets);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch datasets');
    }
  };

  const fetchDatasetInfo = async (datasetId: string) => {
    try {
      const response = await axios.get(`/dataset/${datasetId}`);
      setDatasetInfo(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch dataset info');
    }
  };

  const runAnalysis = async () => {
    if (!selectedDataset) return;

    try {
      setLoading(true);
      
      const response = await axios.post(`/analytics/${selectedDataset}/analyze`, {
        config: analysisConfig
      });

      setAnalysis(response.data);
      showSnackbar('Analysis completed successfully', 'success');
      
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to run analysis', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalysis = async (format: 'pdf' | 'html' | 'json') => {
    if (!selectedDataset || !analysis) return;

    try {
      const response = await axios.post(`/analytics/${selectedDataset}/export`, {
        format: format,
        analysis: analysis
      }, { responseType: 'blob' });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analysis_${selectedDataset}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSnackbar(`Analysis exported as ${format.toUpperCase()}`, 'success');
      
    } catch (err: any) {
      showSnackbar('Failed to export analysis', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const renderDataQualityScore = () => {
    if (!analysis?.data_quality) return null;

    const { overall_score, completeness, accuracy, consistency, validity } = analysis.data_quality;
    const color = getQualityColor(overall_score);
    const label = getQualityLabel(overall_score);

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color={color} gutterBottom>
                {overall_score}%
              </Typography>
              <Typography variant="h6" color={color}>
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall Quality Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quality Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Completeness
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={completeness} 
                      color={getQualityColor(completeness)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {completeness}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Accuracy
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={accuracy} 
                      color={getQualityColor(accuracy)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {accuracy}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Consistency
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={consistency} 
                      color={getQualityColor(consistency)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {consistency}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Validity
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={validity} 
                      color={getQualityColor(validity)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {validity}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderDataIssues = () => {
    if (!analysis?.data_quality?.issues) return null;

    const issues = analysis.data_quality.issues;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Quality Issues
          </Typography>
          
          {issues.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" color="success.main">
                No Issues Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your data quality is excellent!
              </Typography>
            </Box>
          ) : (
            <Box>
              {issues.map((issue, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      label={issue.severity.toUpperCase()} 
                      color={getSeverityColor(issue.severity)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={issue.type} 
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    {issue.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Affects {issue.affected_rows} rows in columns: {issue.affected_columns.join(', ')}
                  </Typography>
                  <Typography variant="body2" color="primary">
                    💡 {issue.suggestion}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCorrelationMatrix = () => {
    if (!analysis?.correlation_matrix) return null;

    const correlations = analysis.correlation_matrix;
    const columns = Object.keys(correlations);

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Correlation Matrix
          </Typography>
          
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Variable</TableCell>
                  {columns.map(col => (
                    <TableCell key={col} align="center">
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {columns.map(row => (
                  <TableRow key={row}>
                    <TableCell component="th" scope="row">
                      {row}
                    </TableCell>
                    {columns.map(col => {
                      const value = correlations[row]?.[col];
                      const isDiagonal = row === col;
                      const color = isDiagonal ? 'grey.300' : 
                                  Math.abs(value) > 0.7 ? 'error.light' :
                                  Math.abs(value) > 0.5 ? 'warning.light' :
                                  Math.abs(value) > 0.3 ? 'info.light' : 'grey.100';
                      
                      return (
                        <TableCell 
                          key={col} 
                          align="center"
                          sx={{ 
                            backgroundColor: color,
                            fontWeight: Math.abs(value) > 0.7 ? 'bold' : 'normal'
                          }}
                        >
                          {isDiagonal ? '1.00' : value?.toFixed(3) || '-'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Interpretation:</strong> Values closer to ±1 indicate stronger correlations. 
              Red highlights show strong correlations (|r| &gt; 0.7), yellow shows moderate (|r| &gt; 0.5).
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderOutlierAnalysis = () => {
    if (!analysis?.outliers) return null;

    const { outliers, summary } = analysis.outliers;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Outlier Detection
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Method: {summary.method} | Threshold: {summary.threshold}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {Object.entries(outliers).map(([column, values]) => (
              <Grid item xs={12} md={6} key={column}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {column}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {values.length} outliers detected
                  </Typography>
                  {values.length > 0 && (
                    <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                      <Typography variant="body2" fontFamily="monospace">
                        {values.slice(0, 10).join(', ')}
                        {values.length > 10 && ` ... and ${values.length - 10} more`}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderTrendAnalysis = () => {
    if (!analysis?.trends) return null;

    const { trends, seasonality, forecasts } = analysis.trends;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Trend Analysis
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Detected Trends
              </Typography>
              {Object.entries(trends).map(([column, trend]) => (
                <Box key={column} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{column}:</strong> {trend.direction} trend 
                    (slope: {trend.slope?.toFixed(4)}, R²: {trend.r_squared?.toFixed(3)})
                  </Typography>
                </Box>
              ))}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Seasonality
              </Typography>
              {Object.entries(seasonality).map(([column, seasonal]) => (
                <Box key={column} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{column}:</strong> {seasonal.pattern} pattern 
                    (period: {seasonal.period}, strength: {seasonal.strength?.toFixed(3)})
                  </Typography>
                </Box>
              ))}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderInsights = () => {
    if (!analysis?.insights) return null;

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Key Insights
          </Typography>
          
          <Box>
            {analysis.insights.map((insight, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: 'info.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <InfoIcon color="info" sx={{ mr: 1, mt: 0.5 }} />
                  <Typography variant="body1">
                    {insight}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <AnalyticsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Advanced Analytics
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Dataset Selection and Analysis Controls */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Dataset
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Dataset</InputLabel>
                <Select
                  value={selectedDataset}
                  label="Dataset"
                  onChange={(e) => setSelectedDataset(e.target.value)}
                >
                  {datasets.map(dataset => (
                    <MenuItem key={dataset.dataset_id} value={dataset.dataset_id}>
                      {dataset.filename} ({dataset.rows} rows × {dataset.columns} cols)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analysis Configuration
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<AnalyticsIcon />}
                  onClick={runAnalysis}
                  disabled={!selectedDataset || loading}
                >
                  {loading ? <CircularProgress size={20} /> : 'Run Analysis'}
                </Button>
                {analysis && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => exportAnalysis('pdf')}
                  >
                    Export PDF
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analysis Results */}
      {analysis && (
        <Card>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Overview" icon={<ViewIcon />} />
            <Tab label="Data Quality" icon={<CheckCircleIcon />} />
            <Tab label="Correlations" icon={<BubbleIcon />} />
            <Tab label="Outliers" icon={<WarningIcon />} />
            <Tab label="Trends" icon={<TrendingUpIcon />} />
            <Tab label="Insights" icon={<InfoIcon />} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              /* Overview Tab */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Analysis Overview
                </Typography>
                
                {renderDataQualityScore()}
                
                <Box sx={{ mt: 3 }}>
                  {renderInsights()}
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              /* Data Quality Tab */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Data Quality Assessment
                </Typography>
                
                {renderDataQualityScore()}
                
                <Box sx={{ mt: 3 }}>
                  {renderDataIssues()}
                </Box>
              </Box>
            )}

            {activeTab === 2 && (
              /* Correlations Tab */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Statistical Correlations
                </Typography>
                
                {renderCorrelationMatrix()}
              </Box>
            )}

            {activeTab === 3 && (
              /* Outliers Tab */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Outlier Detection
                </Typography>
                
                {renderOutlierAnalysis()}
              </Box>
            )}

            {activeTab === 4 && (
              /* Trends Tab */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Trend Analysis
                </Typography>
                
                {renderTrendAnalysis()}
              </Box>
            )}

            {activeTab === 5 && (
              /* Insights Tab */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Key Insights & Recommendations
                </Typography>
                
                {renderInsights()}
                
                <Box sx={{ mt: 3 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recommendations
                      </Typography>
                      {analysis.data_quality.recommendations.map((rec, index) => (
                        <Typography key={index} variant="body1" sx={{ mb: 1 }}>
                          • {rec}
                        </Typography>
                      ))}
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}
          </Box>
        </Card>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvancedAnalytics;
