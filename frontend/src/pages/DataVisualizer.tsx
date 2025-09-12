import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterIcon,
  GridOn as HeatmapIcon,
  BubbleChart as BubbleIcon,
  Timeline as TimelineIcon,
  TableChart as TableIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Palette as PaletteIcon,
  Tune as TuneIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { dataService } from '../services/dataService';

// Declare Plotly as a global variable
declare global {
  interface Window {
    Plotly: any;
  }
}

interface Dataset {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  data_types: Record<string, string>;
  summary_stats?: Record<string, any>;
  column_info?: Record<string, any>;
  upload_time?: string;
}

interface ChartConfig {
  id: string;
  type: string;
  title: string;
  xAxis: string;
  yAxis: string;
  colorBy?: string;
  sizeBy?: string;
  groupBy?: string;
  aggregation?: string;
  customizations: ChartCustomizations;
  enabled: boolean;
  facetMode?: 'none' | 'grid';
  facetCols?: number;
  autoRefresh?: boolean;
}

interface ChartCustomizations {
  theme: string;
  colorPalette: string;
  opacity: number;
  showGrid: boolean;
  showLegend: boolean;
  showLabels: boolean;
  fontSize: number;
  width: number;
  height: number;
}

interface PlotData {
  chartId: string;
  json: { x?: any[]; y?: any[]; labels?: any[]; values?: any[]; x_label?: string; y_label?: string; stats?: any };
  config: ChartConfig;
  timestamp: number;
}

// This will be defined after plotCategories
let chartTypes: any[] = [];

// Theme and color options
const themes = [
  { value: 'plotly_white', label: 'Plotly White', description: 'Clean white background' },
  { value: 'plotly_dark', label: 'Plotly Dark', description: 'Dark theme for low light' },
  { value: 'ggplot2', label: 'ggplot2', description: 'R ggplot2 style' },
  { value: 'seaborn', label: 'Seaborn', description: 'Python seaborn style' },
  { value: 'simple_white', label: 'Simple White', description: 'Minimal white theme' },
  { value: 'presentation', label: 'Presentation', description: 'Professional presentation' },
  { value: 'plotly', label: 'Plotly Default', description: 'Default Plotly theme' },
  { value: 'none', label: 'Custom', description: 'No predefined theme' },
];

const colorPalettes = [
  { value: 'default', label: 'Default', colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'] },
  { value: 'viridis', label: 'Viridis', colors: ['#440154', '#31688e', '#35b779', '#6ece58', '#fde725'] },
  { value: 'plasma', label: 'Plasma', colors: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636'] },
  { value: 'inferno', label: 'Inferno', colors: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d'] },
  { value: 'magma', label: 'Magma', colors: ['#000004', '#4a0c6b', '#8b2981', '#d14d6b', '#feb078'] },
  { value: 'cividis', label: 'Cividis', colors: ['#00204d', '#31446b', '#666970', '#958f78', '#ffea46'] },
  { value: 'turbo', label: 'Turbo', colors: ['#30123b', '#4662d4', '#36aebf', '#7ade7b', '#f0e442'] },
  { value: 'rainbow', label: 'Rainbow', colors: ['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00'] },
  { value: 'professional', label: 'Professional', colors: ['#1f4e79', '#00a86b', '#ff9800', '#9c27b0', '#f44336'] },
  { value: 'pastel', label: 'Pastel', colors: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff'] },
  { value: 'colorblind', label: 'Colorblind Safe', colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'] },
];

// Enhanced plot types with categories and data requirements
const plotCategories = {
  'Basic': [
    { 
      value: 'scatter', 
      label: 'Scatter Plot', 
      icon: <ScatterIcon />,
      description: 'Show relationship between two numeric variables',
      requires: { x: 'numeric', y: 'numeric' },
      supports: ['colorBy', 'sizeBy', 'groupBy']
    },
    { 
      value: 'line', 
      label: 'Line Chart', 
      icon: <LineChartIcon />,
      description: 'Show trends over time or ordered categories',
      requires: { x: 'any', y: 'numeric' },
      supports: ['colorBy', 'groupBy']
    },
    { 
      value: 'bar', 
      label: 'Bar Chart', 
      icon: <BarChartIcon />,
      description: 'Compare values across categories',
      requires: { x: 'categorical', y: 'numeric' },
      supports: ['colorBy', 'groupBy']
    },
    { 
      value: 'pie', 
      label: 'Pie Chart', 
      icon: <PieChartIcon />,
      description: 'Show proportions of a whole',
      requires: { x: 'categorical', y: 'numeric' },
      supports: []
    }
  ],
  'Statistical': [
    { 
      value: 'histogram', 
      label: 'Histogram', 
      icon: <BarChartIcon />,
      description: 'Show distribution of a single variable',
      requires: { x: 'numeric' },
      supports: ['colorBy', 'groupBy']
    },
    { 
      value: 'box', 
      label: 'Box Plot', 
      icon: <BarChartIcon />,
      description: 'Show distribution and outliers',
      requires: { x: 'categorical', y: 'numeric' },
      supports: ['colorBy', 'groupBy']
    },
    { 
      value: 'violin', 
      label: 'Violin Plot', 
      icon: <BarChartIcon />,
      description: 'Show distribution density',
      requires: { x: 'categorical', y: 'numeric' },
      supports: ['colorBy', 'groupBy']
    },
    { 
      value: 'heatmap', 
      label: 'Heatmap', 
      icon: <HeatmapIcon />,
      description: 'Show correlation or intensity matrix',
      requires: { x: 'categorical', y: 'categorical', z: 'numeric' },
      supports: []
    }
  ],
  'Advanced': [
    { 
      value: 'bubble', 
      label: 'Bubble Chart', 
      icon: <BubbleIcon />,
      description: 'Scatter plot with size encoding',
      requires: { x: 'numeric', y: 'numeric', size: 'numeric' },
      supports: ['colorBy', 'groupBy']
    },
    { 
      value: 'area', 
      label: 'Area Chart', 
      icon: <LineChartIcon />,
      description: 'Show cumulative values over time',
      requires: { x: 'any', y: 'numeric' },
      supports: ['colorBy', 'groupBy']
    },
    { 
      value: 'sunburst', 
      label: 'Sunburst', 
      icon: <PieChartIcon />,
      description: 'Hierarchical data visualization',
      requires: { x: 'categorical', y: 'numeric' },
      supports: ['groupBy']
    },
    { 
      value: 'treemap', 
      label: 'Treemap', 
      icon: <HeatmapIcon />,
      description: 'Show hierarchical data as nested rectangles',
      requires: { x: 'categorical', y: 'numeric' },
      supports: ['colorBy']
    }
  ]
};

// Flatten plot categories for backward compatibility
chartTypes = Object.values(plotCategories).flat();

// Helper functions for data analysis and validation
const getColumnType = (columnName: string, datasetInfo: Dataset | null): 'numeric' | 'categorical' | 'datetime' | 'text' => {
  if (!datasetInfo) return 'text';
  
  // First try to get from column_info (new structure)
  if (datasetInfo.column_info && datasetInfo.column_info[columnName]) {
    const type = datasetInfo.column_info[columnName].type;
    if (type === 'numeric') return 'numeric';
    if (type === 'categorical') return 'categorical';
    if (type === 'datetime') return 'datetime';
    if (type === 'text') return 'text';
  }
  
  // Fallback to data_types (old structure)
  const dataType = datasetInfo.data_types[columnName];
  if (dataType === 'int64' || dataType === 'float64' || dataType === 'numeric') {
    return 'numeric';
  } else if (dataType === 'datetime64' || dataType === 'datetime') {
    return 'datetime';
  } else if (dataType === 'object' || dataType === 'category') {
    return 'categorical';
  }
  return 'text';
};

const validatePlotRequirements = (plotType: string, xAxis: string, yAxis: string, datasetInfo: Dataset | null): { valid: boolean; errors: string[]; warnings: string[]; transformations: any } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transformations: any = {};
  
  if (!datasetInfo) {
    return { valid: false, errors: ['No dataset selected'], warnings: [], transformations: {} };
  }
  
  const plotDef = Object.values(plotCategories).flat().find(p => p.value === plotType);
  if (!plotDef) {
    return { valid: false, errors: ['Unknown plot type'], warnings: [], transformations: {} };
  }
  
  const xType = getColumnType(xAxis, datasetInfo);
  const yType = getColumnType(yAxis, datasetInfo);
  
  // Adaptive validation with transformation suggestions
  if (plotDef.requires.x === 'numeric' && xType !== 'numeric') {
    if (xType === 'categorical') {
      warnings.push(`X-axis is categorical but ${plotDef.label} works best with numeric data. Consider using a different plot type or the system will attempt to convert.`);
      transformations.x_transform = 'categorical_to_numeric';
    } else if (xType === 'datetime') {
      warnings.push(`X-axis is datetime but ${plotDef.label} works best with numeric data. The system will convert to numeric.`);
      transformations.x_transform = 'datetime_to_numeric';
    } else {
      errors.push(`X-axis must be numeric for ${plotDef.label}. Current type: ${xType}`);
    }
  } else if (plotDef.requires.x === 'categorical' && xType !== 'categorical') {
    if (xType === 'numeric') {
      warnings.push(`X-axis is numeric but ${plotDef.label} works best with categorical data. The system will create bins.`);
      transformations.x_transform = 'numeric_to_categorical';
    } else if (xType === 'datetime') {
      warnings.push(`X-axis is datetime but ${plotDef.label} works best with categorical data. The system will extract time periods.`);
      transformations.x_transform = 'datetime_to_categorical';
    } else {
      errors.push(`X-axis must be categorical for ${plotDef.label}. Current type: ${xType}`);
    }
  }
  
  if (plotDef.requires.y === 'numeric' && yType !== 'numeric') {
    if (yType === 'categorical') {
      warnings.push(`Y-axis is categorical but ${plotDef.label} works best with numeric data. The system will attempt to convert.`);
      transformations.y_transform = 'categorical_to_numeric';
    } else if (yType === 'datetime') {
      warnings.push(`Y-axis is datetime but ${plotDef.label} works best with numeric data. The system will convert to numeric.`);
      transformations.y_transform = 'datetime_to_numeric';
    } else {
      errors.push(`Y-axis must be numeric for ${plotDef.label}. Current type: ${yType}`);
    }
  } else if (plotDef.requires.y === 'categorical' && yType !== 'categorical') {
    if (yType === 'numeric') {
      warnings.push(`Y-axis is numeric but ${plotDef.label} works best with categorical data. The system will create bins.`);
      transformations.y_transform = 'numeric_to_categorical';
    } else if (yType === 'datetime') {
      warnings.push(`Y-axis is datetime but ${plotDef.label} works best with categorical data. The system will extract time periods.`);
      transformations.y_transform = 'datetime_to_categorical';
    } else {
      errors.push(`Y-axis must be categorical for ${plotDef.label}. Current type: ${yType}`);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings, transformations };
};

const getRecommendedPlots = (datasetInfo: Dataset | null): string[] => {
  if (!datasetInfo) return [];
  
  const recommendations: string[] = [];
  const numericCols = Object.keys(datasetInfo.data_types).filter(col => 
    getColumnType(col, datasetInfo) === 'numeric'
  );
  const categoricalCols = Object.keys(datasetInfo.data_types).filter(col => 
    getColumnType(col, datasetInfo) === 'categorical'
  );
  
  if (numericCols.length >= 2) {
    recommendations.push('scatter', 'line');
  }
  if (categoricalCols.length >= 1 && numericCols.length >= 1) {
    recommendations.push('bar', 'box', 'violin');
  }
  if (numericCols.length >= 1) {
    recommendations.push('histogram');
  }
  if (categoricalCols.length >= 2 && numericCols.length >= 1) {
    recommendations.push('heatmap');
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
};

const DataVisualizer: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [datasetInfo, setDatasetInfo] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [plotData, setPlotData] = useState<PlotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [statusLog, setStatusLog] = useState<Array<{ ts: string; level: 'info' | 'warning' | 'error'; message: string }>>([]);
  
  // New centralized data management state
  const [currentVersionId, setCurrentVersionId] = useState<string>('');
  const [datasetVersions, setDatasetVersions] = useState<any[]>([]);
  const [showVersionManager, setShowVersionManager] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  
  // Refs for chart containers
  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Load datasets on component mount
  useEffect(() => {
    fetchDatasets();
  }, []);

  // Load dataset info when selection changes
  useEffect(() => {
    if (selectedDataset) {
      fetchDatasetInfo();
      fetchDatasetPreview();
      loadDatasetVersions(selectedDataset);
      logStatus('info', `Switched to dataset: ${selectedDataset}`);
    }
  }, [selectedDataset]);

  // Load dataset versions
  const loadDatasetVersions = async (datasetId: string) => {
    try {
      const versions = await dataService.listDatasetVersions(datasetId);
      setDatasetVersions(versions);
      
      // Check localStorage for current version first
      const storedVersionId = localStorage.getItem(`currentVersion_${datasetId}`);
      if (storedVersionId && versions.find((v: any) => v.version_id === storedVersionId)) {
        setCurrentVersionId(storedVersionId);
        console.log(`Using stored version: ${storedVersionId}`);
      } else {
        // Set current version to original if available
        const originalVersion = versions.find((v: any) => dataService.isOriginalVersion(v.version_id));
        if (originalVersion) {
          setCurrentVersionId(originalVersion.version_id);
          localStorage.setItem(`currentVersion_${datasetId}`, originalVersion.version_id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load dataset versions:', err);
    }
  };

  // Refresh dataset info when returning to tab/window to reflect Data Explorer changes
  useEffect(() => {
    const onFocus = () => {
      if (selectedDataset) {
        fetchDatasetInfo();
        fetchDatasetPreview();
        logStatus('info', 'Refreshed dataset state from Data Explorer changes');
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [selectedDataset]);

  // Listen for version changes from Data Explorer
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `currentVersion_${selectedDataset}` && e.newValue) {
        console.log(`Version changed to: ${e.newValue}`);
        setCurrentVersionId(e.newValue);
        // Refresh data with new version
        setTimeout(() => {
          fetchDatasetInfo();
          fetchDatasetPreview();
        }, 100);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedDataset]);

  // Refresh dataset info when component becomes visible (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedDataset) {
        // Small delay to ensure the tab is fully active
        setTimeout(() => {
          fetchDatasetInfo();
          fetchDatasetPreview();
          logStatus('info', 'Dataset state synchronized with Data Explorer');
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedDataset]);

  // Load Plotly.js if not already loaded
  useEffect(() => {
    if (!window.Plotly) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
      script.onload = () => {
        console.log('Plotly.js loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load Plotly.js');
        setError('Failed to load chart library. Please refresh the page.');
      };
      document.head.appendChild(script);
    }
  }, []);

  // Render charts when plotData changes
  useEffect(() => {
    plotData.forEach(plot => {
      const chart = charts.find(c => c.id === plot.chartId);
      if (!chart) return;
      if (plot.json && (plot.json.x || plot.json.labels)) {
        setTimeout(() => {
          renderChartToDOM(plot.chartId, chart, plot.json);
        }, 100);
      }
    });
  }, [plotData]);

  // Auto-refresh active chart when its config changes
  useEffect(() => {
    const active = charts[activeTab];
    if (!active || !selectedDataset) return;
    // update default title if empty
    if (!active.title && active.xAxis && active.yAxis) {
      updateChart(active.id, { title: `${active.yAxis} vs ${active.xAxis}` });
    }
    if (active.enabled && active.autoRefresh) {
      const timer = setTimeout(() => generateChart(active), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charts, activeTab, selectedDataset]);

  const fetchDatasets = async () => {
    try {
      const response = await axios.get('/datasets');
      setDatasets(response.data.datasets || []);
    } catch (err: any) {
      console.error('Failed to fetch datasets:', err);
      setError('Failed to load datasets');
    }
  };

  const fetchDatasetInfo = async () => {
    try {
      console.log('Fetching dataset info for:', selectedDataset);
      console.log('Current version ID:', currentVersionId);
      
      // Always use centralized data service with current version
      if (currentVersionId) {
        const versionInfo = await dataService.getVersionInfo(currentVersionId);
        
        // Get column names from the actual data
        const data = await dataService.getVersionData(currentVersionId, 1); // Just get 1 row for column names
        const columnNames = data.length > 0 ? Object.keys(data[0]) : [];
        
        // Get column information
        console.log('Fetching column info for version:', currentVersionId);
        let columnInfo = {};
        let dataTypes: Record<string, string> = {};
        
        try {
          columnInfo = await dataService.getVersionColumnInfo(currentVersionId);
          console.log('Column info received:', columnInfo);
          
          // Convert column_info to data_types for backward compatibility
          Object.keys(columnInfo).forEach(col => {
            dataTypes[col] = columnInfo[col].type;
          });
          console.log('Data types converted:', dataTypes);
        } catch (columnErr) {
          console.warn('Failed to get column info, using fallback:', columnErr);
          // Fallback: try to infer types from the data
          if (data.length > 0) {
            const sampleRow = data[0];
            Object.keys(sampleRow).forEach(col => {
              const value = sampleRow[col];
              if (typeof value === 'number') {
                dataTypes[col] = 'numeric';
              } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
                dataTypes[col] = 'datetime';
              } else {
                dataTypes[col] = 'categorical';
              }
            });
          }
        }
        
        setDatasetInfo({
          dataset_id: selectedDataset,
          filename: versionInfo.name,
          rows: versionInfo.row_count,
          columns: versionInfo.column_count,
          column_names: columnNames,
          data_types: dataTypes,
          summary_stats: {},
          column_info: columnInfo,
          upload_time: versionInfo.created_at
        } as Dataset);
        logStatus('info', `Dataset loaded: ${versionInfo.row_count} rows, ${versionInfo.column_count} columns`);
      } else {
        // If no current version, try to get the original version
        const originalVersionId = dataService.getOriginalVersionId(selectedDataset);
        try {
          const versionInfo = await dataService.getVersionInfo(originalVersionId);
          setCurrentVersionId(originalVersionId);
          
          // Get column names from the actual data
          const data = await dataService.getVersionData(originalVersionId, 1); // Just get 1 row for column names
          const columnNames = data.length > 0 ? Object.keys(data[0]) : [];
          
          // Get column information
          console.log('Fetching column info for original version:', originalVersionId);
          let columnInfo = {};
          let dataTypes: Record<string, string> = {};
          
          try {
            columnInfo = await dataService.getVersionColumnInfo(originalVersionId);
            console.log('Column info received:', columnInfo);
            
            // Convert column_info to data_types for backward compatibility
            Object.keys(columnInfo).forEach(col => {
              dataTypes[col] = columnInfo[col].type;
            });
            console.log('Data types converted:', dataTypes);
          } catch (columnErr) {
            console.warn('Failed to get column info, using fallback:', columnErr);
            // Fallback: try to infer types from the data
            if (data.length > 0) {
              const sampleRow = data[0];
              Object.keys(sampleRow).forEach(col => {
                const value = sampleRow[col];
                if (typeof value === 'number') {
                  dataTypes[col] = 'numeric';
                } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
                  dataTypes[col] = 'datetime';
                } else {
                  dataTypes[col] = 'categorical';
                }
              });
            }
          }
          
          setDatasetInfo({
            dataset_id: selectedDataset,
            filename: versionInfo.name,
            rows: versionInfo.row_count,
            columns: versionInfo.column_count,
            column_names: columnNames,
            data_types: dataTypes,
            summary_stats: {},
            column_info: columnInfo,
            upload_time: versionInfo.created_at
          } as Dataset);
          logStatus('info', `Dataset loaded: ${versionInfo.row_count} rows, ${versionInfo.column_count} columns`);
        } catch (versionErr) {
          // Final fallback to legacy endpoint
          console.log('Falling back to legacy endpoint');
          try {
            const response = await axios.get(`/dataset/${selectedDataset}`);
            setDatasetInfo(response.data);
            logStatus('info', `Dataset loaded: ${response.data.rows} rows, ${response.data.columns} columns`);
          } catch (legacyErr) {
            console.error('Legacy endpoint also failed:', legacyErr);
            setError('Failed to load dataset information from all sources');
            logStatus('error', 'Failed to load dataset information from all sources');
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch dataset info:', err);
      setError('Failed to load dataset information');
      logStatus('error', 'Failed to load dataset information');
    }
  };

  const fetchDatasetPreview = async () => {
    try {
      // Always use centralized data service with current version
      if (currentVersionId) {
        const data = await dataService.getVersionData(currentVersionId, 100);
        setPreviewData(data);
        logStatus('info', `Preview loaded: ${data.length} rows`);
      } else {
        // If no current version, try to get the original version
        const originalVersionId = dataService.getOriginalVersionId(selectedDataset);
        try {
          const data = await dataService.getVersionData(originalVersionId, 100);
          setCurrentVersionId(originalVersionId);
          setPreviewData(data);
          logStatus('info', `Preview loaded: ${data.length} rows`);
        } catch (versionErr) {
          // Final fallback to legacy endpoint
          console.log('Falling back to legacy endpoint for preview');
          const response = await axios.get(`/dataset/${selectedDataset}/preview?rows=100`);
          setPreviewData(response.data.preview_data || []);
          logStatus('info', `Preview loaded: ${response.data.preview_data?.length || 0} rows`);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch dataset preview:', err);
      setError('Failed to load dataset preview');
      logStatus('error', 'Failed to load dataset preview');
    }
  };

  const getNumericColumns = () => {
    if (!datasetInfo) return [];
    return datasetInfo.column_names.filter(col => {
      const dataType = datasetInfo.data_types[col];
      return dataType === 'int64' || dataType === 'float64' || dataType === 'number' || dataType === 'numeric';
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const logStatus = (level: 'info' | 'warning' | 'error', message: string) => {
    const ts = new Date().toLocaleTimeString();
    setStatusLog(prev => [{ ts, level, message }, ...prev].slice(0, 50));
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const addChart = () => {
    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      type: 'bar',
      title: datasetInfo ? `${getNumericColumns()[0] || ''} vs ${datasetInfo.column_names[0] || ''}` : `New Chart ${charts.length + 1}`,
      xAxis: datasetInfo?.column_names[0] || '',
      yAxis: getNumericColumns()[0] || '',
      customizations: {
        theme: 'plotly_white',
        colorPalette: 'default',
        opacity: 0.8,
        showGrid: true,
        showLegend: true,
        showLabels: false,
        fontSize: 12,
        width: 600,
        height: 400,
      },
      enabled: true,
      facetMode: 'none',
      facetCols: 2,
      autoRefresh: true,
    };
    setCharts(prev => [...prev, newChart]);
  };

  const updateChart = (chartId: string, updates: Partial<ChartConfig>) => {
    setCharts(prev => prev.map(chart => 
      chart.id === chartId ? { ...chart, ...updates } : chart
    ));
  };

  const removeChart = (chartId: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== chartId));
    setPlotData(prev => prev.filter(plot => plot.chartId !== chartId));
  };

  const generateChart = async (chart: ChartConfig) => {
    if (!selectedDataset || !chart.enabled) return;

    // Validate plot requirements with adaptive transformations
    const validation = validatePlotRequirements(chart.type, chart.xAxis, chart.yAxis, datasetInfo);
    if (!validation.valid) {
      const errorMsg = validation.errors.join(', ');
      showSnackbar(`Invalid configuration: ${errorMsg}`, 'error');
      logStatus('error', `Chart validation failed: ${errorMsg}`);
      return;
    }
    
    // Show warnings if any transformations will be applied
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        logStatus('warning', warning);
      });
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Generating JSON chart with config:', chart);
      let response;
      
      // Enhanced error handling for different plot types with adaptive transformations
      try {
        // Add transformation parameters to all requests
        const addTransformParams = (params: URLSearchParams) => {
          if (validation.transformations.x_transform) {
            params.set('x_transform', validation.transformations.x_transform);
          }
          if (validation.transformations.y_transform) {
            params.set('y_transform', validation.transformations.y_transform);
          }
          return params;
        };

        if (chart.type === 'bar') {
          const params = new URLSearchParams({ 
            category: chart.xAxis || '', 
            value: chart.yAxis || '', 
            agg: chart.aggregation || 'mean', 
            bins: '10' 
          });
          addTransformParams(params);
          response = await axios.get(`/visualize/${selectedDataset}/json_bar?${params.toString()}`);
        } else if (chart.type === 'histogram') {
          const params = new URLSearchParams({ 
            x: chart.xAxis || '', 
            bins: '20' 
          });
          addTransformParams(params);
          response = await axios.get(`/visualize/${selectedDataset}/json_histogram?${params.toString()}`);
        } else if (chart.type === 'box' || chart.type === 'violin') {
          const params = new URLSearchParams({ 
            x: chart.xAxis || '', 
            y: chart.yAxis || '' 
          });
          addTransformParams(params);
          response = await axios.get(`/visualize/${selectedDataset}/json_box?${params.toString()}`);
        } else if (chart.type === 'heatmap') {
          const params = new URLSearchParams({ 
            x: chart.xAxis || '', 
            y: chart.yAxis || '',
            z: chart.sizeBy || chart.yAxis || ''
          });
          addTransformParams(params);
          response = await axios.get(`/visualize/${selectedDataset}/json_heatmap?${params.toString()}`);
        } else {
          // Default to scatter-style JSON for most plot types
          const params = new URLSearchParams({ 
            x: chart.xAxis || '', 
            y: chart.yAxis || '', 
            sample: '1000' 
          });
          if (chart.groupBy) params.set('group', chart.groupBy);
          if (chart.colorBy) params.set('color', chart.colorBy);
          if (chart.sizeBy) params.set('size', chart.sizeBy);
          addTransformParams(params);
          response = await axios.get(`/visualize/${selectedDataset}/json_scatter?${params.toString()}`);
        }
      } catch (apiError: any) {
        // Fallback to scatter plot if specific endpoint fails
        console.warn(`Specific endpoint failed for ${chart.type}, falling back to scatter:`, apiError);
        const params = new URLSearchParams({ 
          x: chart.xAxis || '', 
          y: chart.yAxis || '', 
          sample: '1000' 
        });
        if (chart.groupBy) params.set('group', chart.groupBy);
        if (chart.colorBy) params.set('color', chart.colorBy);
        if (chart.sizeBy) params.set('size', chart.sizeBy);
        // Add transformation parameters to fallback as well
        if (validation.transformations.x_transform) {
          params.set('x_transform', validation.transformations.x_transform);
        }
        if (validation.transformations.y_transform) {
          params.set('y_transform', validation.transformations.y_transform);
        }
        response = await axios.get(`/visualize/${selectedDataset}/json_scatter?${params.toString()}`);
      }

      const json = response.data;
      console.log('Received JSON data:', json);

      // Validate response data
      if (!json || (!json.x && !json.labels) || (!json.y && !json.values)) {
        throw new Error('Invalid data received from server');
      }

      const newPlot: PlotData = {
        chartId: chart.id,
        json,
        config: chart,
        timestamp: Date.now()
      };

      setPlotData(prev => {
        const filtered = prev.filter(plot => plot.chartId !== chart.id);
        return [...filtered, newPlot];
      });

      showSnackbar('Chart generated successfully', 'success');
      logStatus('info', `Chart "${chart.title}" generated successfully`);
      
    } catch (err: any) {
      console.error('Chart generation error:', err);
      let errorMessage = 'Failed to generate chart';
      
      if (err.response?.status === 404) {
        errorMessage = 'Chart type not supported by backend';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.detail || 'Invalid data configuration';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error - check data types and column names';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      showSnackbar(`Chart Generation Error: ${errorMessage}`, 'error');
      logStatus('error', `Chart generation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear cache and temporary versions
  const clearCache = async () => {
    try {
      setLoading(true);
      const result = await dataService.clearCache();
      console.log('Cache cleared:', result);
      
      // Refresh the datasets and versions
      await fetchDatasets();
      if (selectedDataset) {
        await loadDatasetVersions(selectedDataset);
      }
      
      logStatus('info', result.message);
      setShowClearCacheDialog(false);
    } catch (err: any) {
      console.error('Failed to clear cache:', err);
      setError(err.response?.data?.detail || 'Failed to clear cache');
      logStatus('error', 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const generateTestChart = async () => {
    if (!selectedDataset) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Generating test JSON chart...');
      
      // Get the first two columns from the actual data
      let x = '';
      let y = '';
      
      if (previewData && previewData.length > 0) {
        const columns = Object.keys(previewData[0]);
        x = columns[0] || '';
        y = columns[1] || columns[0] || '';
      } else if (datasetInfo?.column_names && datasetInfo.column_names.length > 0) {
        x = datasetInfo.column_names[0];
        y = datasetInfo.column_names[1] || datasetInfo.column_names[0];
      }
      
      if (!x || !y) {
        throw new Error('No columns available for test chart');
      }
      const params = new URLSearchParams({ x, y, sample: '200' });
      const response = await axios.get(`/visualize/${selectedDataset}/json_scatter?${params.toString()}`);

      const newPlot: PlotData = {
        chartId: 'test_chart',
        json: response.data,
        config: {
          id: 'test_chart',
          type: 'scatter',
          title: 'Test Chart',
          xAxis: x,
          yAxis: y,
          customizations: {
            theme: 'plotly_white',
            colorPalette: 'default',
            opacity: 0.8,
            showGrid: true,
            showLegend: true,
            showLabels: false,
            fontSize: 12,
            width: 600,
            height: 400
          },
          enabled: true
        },
        timestamp: Date.now()
      };

      setPlotData(prev => {
        const filtered = prev.filter(plot => plot.chartId !== 'test_chart');
        return [...filtered, newPlot];
      });

      showSnackbar('Test chart generated successfully', 'success');
      
    } catch (err: any) {
      console.error('Test chart generation error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to generate test chart';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const createLayout = (chart: ChartConfig, title: string, xTitle: string, yTitle: string) => {
    const layout: any = {
      title: {
        text: title,
        font: { size: chart.customizations.fontSize + 4 }
      },
      xaxis: { 
        title: xTitle,
        showgrid: chart.customizations.showGrid,
        gridcolor: 'rgba(128,128,128,0.2)',
        titlefont: { size: chart.customizations.fontSize }
      },
      yaxis: { 
        title: yTitle,
        showgrid: chart.customizations.showGrid,
        gridcolor: 'rgba(128,128,128,0.2)',
        titlefont: { size: chart.customizations.fontSize }
      },
      width: chart.customizations.width,
      height: chart.customizations.height,
      margin: { t: 60, r: 20, b: 60, l: 60 },
      font: { size: chart.customizations.fontSize },
      showlegend: chart.customizations.showLegend,
      legend: {
        font: { size: chart.customizations.fontSize - 1 }
      }
    };

    // Apply theme
    if (chart.customizations.theme && chart.customizations.theme !== 'none') {
      layout.template = chart.customizations.theme;
    } else {
      // Custom theme
      layout.paper_bgcolor = 'white';
      layout.plot_bgcolor = 'white';
      layout.font = { color: '#1a202c', size: chart.customizations.fontSize };
    }

    return layout;
  };

  const renderChartToDOM = (chartId: string, chart: ChartConfig, json: any) => {
    if (!window.Plotly) {
      console.error('Plotly not available');
      return;
    }

    const chartContainer = chartRefs.current[chartId];
    if (!chartContainer) {
      console.error(`Chart container not found for ${chartId}`);
      return;
    }

    try {
      console.log(`Rendering chart ${chartId} (type=${chart.type}) with JSON:`, json);

      const type = chart.type;
      let data: any[] = [];
      
      // Get color palette
      const palette = colorPalettes.find(p => p.value === chart.customizations.colorPalette);
      const colors = palette?.colors || colorPalettes[0].colors;
      
      const baseScatter = (x: any[], y: any[], name: string, g?: any, colorIndex: number = 0) => ({
        x,
        y,
        type: type === 'bar' ? 'bar' : 'scatter',
        mode: type === 'line' ? 'lines+markers' : 'markers',
        name,
        marker: {
          color: g?.color ?? colors[colorIndex % colors.length],
          size: g?.size ?? json.size,
          opacity: chart.customizations.opacity,
          line: {
            width: 1,
            color: 'rgba(255,255,255,0.8)'
          }
        },
        line: type === 'line' ? {
          color: g?.color ?? colors[colorIndex % colors.length],
          width: 2
        } : undefined
      });

      if (chart.groupBy && json.groups && chart.facetMode === 'grid') {
        // Facet grid: render per-group charts in a simple CSS grid
        const cols = Math.max(1, chart.facetCols || 2);
        const wrapperId = `facet-wrapper-${chart.id}`;
        let wrapper = chartContainer.querySelector(`#${wrapperId}`) as HTMLDivElement | null;
        if (!wrapper) {
          chartContainer.innerHTML = '';
          wrapper = document.createElement('div');
          wrapper.id = wrapperId;
          wrapper.style.display = 'grid';
          wrapper.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
          wrapper.style.gap = '8px';
          chartContainer.appendChild(wrapper);
        } else {
          wrapper.innerHTML = '';
        }
        json.groups.forEach((g: any, index: number) => {
          const cell = document.createElement('div');
          cell.style.width = '100%';
          cell.style.height = '280px';
          wrapper!.appendChild(cell);
          const traces = [baseScatter(g.x, g.y, g.name, g, index)];
          const layout: any = createLayout(chart, g.name, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
          window.Plotly.newPlot(cell, traces, layout, { responsive: true, displaylogo: false });
        });
        return;
      } else if (chart.groupBy && json.groups) {
        data = json.groups.map((g: any, index: number) => baseScatter(g.x, g.y, g.name, g, index));
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
        window.Plotly.newPlot(chartContainer, data, layout, { responsive: true, displaylogo: false });
        return;
      } else if (type === 'bar') {
        data = [{ 
          x: json.x, 
          y: json.y, 
          type: 'bar', 
          name: chart.title,
          marker: {
            color: colors[0],
            opacity: chart.customizations.opacity,
            line: {
              width: 1,
              color: 'rgba(255,255,255,0.8)'
            }
          }
        }];
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
        window.Plotly.newPlot(chartContainer, data, layout, { responsive: true, displaylogo: false });
        return;
      } else if (type === 'line') {
        data = [baseScatter(json.x, json.y, chart.title, undefined, 0)];
        data[0].mode = 'lines+markers';
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
        window.Plotly.newPlot(chartContainer, data, layout, { responsive: true, displaylogo: false });
        return;
      } else if (type === 'pie') {
        const traces = [{ 
          labels: json.labels || json.x, 
          values: json.values || json.y, 
          type: 'pie', 
          name: chart.title,
          marker: {
            colors: colors.slice(0, (json.labels || json.x).length),
            opacity: chart.customizations.opacity
          }
        }];
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, '', '');
        window.Plotly.newPlot(chartContainer, traces, layout, { responsive: true, displaylogo: false });
        return;
      } else if (type === 'histogram') {
        data = [{ 
          x: json.x, 
          y: json.y, 
          type: 'bar', 
          name: chart.title,
          marker: {
            color: colors[0],
            opacity: chart.customizations.opacity
          }
        }];
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
        window.Plotly.newPlot(chartContainer, data, layout, { responsive: true, displaylogo: false });
        return;
      } else if (type === 'box') {
        // Handle box plot data structure
        if (json.box_data) {
          data = json.box_data.map((box: any, index: number) => ({
            y: box.inliers,
            type: 'box',
            name: box.category,
            marker: {
              color: colors[index % colors.length],
              opacity: chart.customizations.opacity
            }
          }));
        } else {
          // Fallback to simple box plot
          data = [{
            y: json.y,
            type: 'box',
            name: chart.title,
            marker: {
              color: colors[0],
              opacity: chart.customizations.opacity
            }
          }];
        }
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
        window.Plotly.newPlot(chartContainer, data, layout, { responsive: true, displaylogo: false });
        return;
      } else if (type === 'heatmap') {
        data = [{
          x: json.x,
          y: json.y,
          z: json.z,
          type: 'heatmap',
          colorscale: chart.customizations.colorPalette === 'viridis' ? 'Viridis' : 
                     chart.customizations.colorPalette === 'plasma' ? 'Plasma' :
                     chart.customizations.colorPalette === 'inferno' ? 'Inferno' : 'Blues',
          showscale: true
        }];
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
        window.Plotly.newPlot(chartContainer, data, layout, { responsive: true, displaylogo: false });
        return;
      } else {
        data = [baseScatter(json.x, json.y, chart.title, undefined, 0)];
        chartContainer.innerHTML = '';
        const layout = createLayout(chart, chart.title, json.x_label || chart.xAxis, json.y_label || chart.yAxis);
        window.Plotly.newPlot(chartContainer, data, layout, { responsive: true, displaylogo: false });
        return;
      }
      // Fallback no-op (should have returned in branches)
      return;
      
      console.log(`Chart ${chartId} rendered successfully`);

      // Show any backend warnings in the snackbar
      if (json.warnings && Array.isArray(json.warnings) && json.warnings.length > 0) {
        const msg = json.warnings.join(' | ');
        showSnackbar(msg, 'warning');
        logStatus('warning', msg);
      }
    } catch (err) {
      console.error(`Error rendering chart ${chartId}:`, err);
      chartContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Error rendering chart: ${err}</div>`;
    }
  };

  const exportChart = async (chartId: string, format: 'png' | 'svg' | 'pdf' | 'html') => {
    try {
      const plot = plotData.find(p => p.chartId === chartId);
      if (!plot) return;

      const response = await axios.post(`/visualize/${selectedDataset}/export`, {
        chart_id: chartId,
        format: format,
        config: plot.config
      }, { responseType: 'blob' });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${plot.config.title}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSnackbar(`Chart exported as ${format.toUpperCase()}`, 'success');
      
    } catch (err: any) {
      showSnackbar('Failed to export chart', 'error');
    }
  };

  const renderChartPreview = (chart: ChartConfig) => {
    const plot = plotData.find(p => p.chartId === chart.id);
    
    if (!plot) {
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: chart.customizations.height,
          backgroundColor: 'grey.100',
          borderRadius: 1,
          flexDirection: 'column',
          gap: 2
        }}>
          <Typography variant="body2" color="text.secondary">
            No chart data available
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => generateChart(chart)}
            disabled={loading || !selectedDataset}
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            {loading ? 'Generating...' : 'Generate Chart'}
          </Button>
        </Box>
      );
    }

    // Render container for imperative Plotly rendering
    return (
      <Box sx={{ 
        height: chart.customizations.height,
        width: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <div
          ref={el => chartRefs.current[chart.id] = el}
          id={`chart-container-${chart.id}`}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '300px'
          }}
        />
        {/* Export Options */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['png', 'svg', 'pdf', 'html'].map(format => (
            <Button
              key={format}
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => exportChart(chart.id, format as any)}
              disabled={!plotData.find(p => p.chartId === chart.id)}
            >
              {format.toUpperCase()}
            </Button>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        <BarChartIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Data Visualizer
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Datasets
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Select Dataset</InputLabel>
                <Select
                  value={selectedDataset}
                  label="Select Dataset"
                  onChange={(e) => setSelectedDataset(e.target.value as string)}
                  fullWidth
                >
                  {datasets.map((dataset) => (
                    <MenuItem key={dataset.dataset_id} value={dataset.dataset_id}>
                      {dataset.filename} ({dataset.rows} rows, {dataset.columns} columns)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Version Manager */}
              {selectedDataset && datasetVersions.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Dataset Versions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {datasetVersions.map((version) => (
                      <Box
                        key={version.version_id}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: version.version_id === currentVersionId ? 'primary.light' : 'grey.100',
                          cursor: 'pointer',
                          border: version.version_id === currentVersionId ? '2px solid' : '1px solid',
                          borderColor: version.version_id === currentVersionId ? 'primary.main' : 'grey.300',
                          '&:hover': {
                            bgcolor: version.version_id === currentVersionId ? 'primary.light' : 'grey.200'
                          }
                        }}
                        onClick={() => {
                          setCurrentVersionId(version.version_id);
                          localStorage.setItem(`currentVersion_${selectedDataset}`, version.version_id);
                          fetchDatasetInfo();
                          fetchDatasetPreview();
                        }}
                      >
                        <Typography variant="body2" fontWeight={version.version_id === currentVersionId ? 'bold' : 'normal'}>
                          {version.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {version.row_count} rows • {new Date(version.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowVersionManager(true)}
                    sx={{ mt: 1 }}
                    fullWidth
                  >
                    Manage Versions
                  </Button>
                </Box>
              )}
              
              {selectedDataset && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      fetchDatasetInfo();
                      fetchDatasetPreview();
                      logStatus('info', 'Manually refreshed dataset state');
                    }}
                    disabled={loading}
                    variant="outlined"
                  >
                    Sync with Data Explorer
                  </Button>
                </Box>
              )}
              
              {datasetInfo && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Current Dataset State
                  </Typography>
                  <Typography variant="body2">
                    <strong>{datasetInfo.filename}</strong> - {datasetInfo.rows} rows, {datasetInfo.columns} columns
                  </Typography>
                  {datasetInfo.rows !== datasets.find(d => d.dataset_id === selectedDataset)?.rows && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                      ⚠️ Dataset has been modified (filters/transformations applied)
                    </Typography>
                  )}
                </Box>
              )}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addChart}
                fullWidth
                sx={{ mt: 2 }}
              >
                Add New Chart
              </Button>
              {/* Dummy loader removed per request */}
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ViewIcon />}
                onClick={generateTestChart}
                disabled={!selectedDataset || loading}
                fullWidth
                sx={{ mt: 1 }}
              >
                Test Chart
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<DeleteIcon />}
                onClick={() => setShowClearCacheDialog(true)}
                disabled={loading}
                fullWidth
                sx={{ mt: 1 }}
              >
                Clear Cache & Reset
              </Button>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Status</Typography>
                <Paper variant="outlined" sx={{ p: 1, maxHeight: 160, overflow: 'auto' }}>
                  {statusLog.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">No messages yet</Typography>
                  ) : (
                    statusLog.map((s, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                        <Typography variant="caption" color="text.secondary">[{s.ts}]</Typography>
                        <Typography variant="caption" color={s.level === 'error' ? 'error.main' : s.level === 'warning' ? 'warning.main' : 'text.primary'}>
                          {s.level.toUpperCase()}: {s.message}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Charts
              </Typography>
              {charts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No charts configured yet
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addChart}
                    disabled={!selectedDataset}
                  >
                    Create Your First Chart
                  </Button>
                </Box>
              ) : (
                <>
                  <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    {charts.map((chart, index) => (
                      <Tab
                        key={chart.id}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {chartTypes.find(type => type.value === chart.type)?.icon}
                            {chart.title || `${chart.yAxis} vs ${chart.xAxis}`}
                          </Box>
                        }
                        icon={chartTypes.find(type => type.value === chart.type)?.icon}
                        iconPosition="start"
                      />
                    ))}
                  </Tabs>
                  <Divider />
                  {charts.map((chart, index) => (
                    <TabPanel key={chart.id} value={activeTab} index={index}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          value={chart.title || ''}
                          onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                          placeholder={`${chart.yAxis} vs ${chart.xAxis}`}
                          sx={{ minWidth: 280 }}
                        />
                        <Box>
                          <IconButton onClick={() => generateChart(chart)} disabled={loading || !selectedDataset}>
                            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                          </IconButton>
                          <IconButton onClick={() => removeChart(chart.id)}>
                            <RemoveIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={chart.enabled}
                              onChange={(e) => updateChart(chart.id, { enabled: e.target.checked })}
                              name="enabled"
                            />
                          }
                          label="Enabled"
                        />
                        <FormControl fullWidth>
                          <InputLabel>Chart Type</InputLabel>
                          <Select
                            value={chart.type}
                            label="Chart Type"
                            onChange={(e) => updateChart(chart.id, { type: e.target.value as string })}
                            fullWidth
                          >
                            {/* Recommended plots section */}
                            {getRecommendedPlots(datasetInfo).length > 0 && [
                              <MenuItem key="recommended-header" disabled sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                💡 Recommended for your data
                              </MenuItem>,
                              ...getRecommendedPlots(datasetInfo).map((plotType) => {
                                const plot = Object.values(plotCategories).flat().find(p => p.value === plotType);
                                return plot ? (
                                  <MenuItem key={`rec-${plot.value}`} value={plot.value} sx={{ pl: 3, backgroundColor: 'rgba(0, 168, 107, 0.05)' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {plot.icon}
                                      <Box>
                                        <Typography variant="body2" fontWeight={500}>
                                          {plot.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {plot.description}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </MenuItem>
                                ) : null;
                              })
                            ]}
                            
                            {/* All plot categories */}
                            {Object.entries(plotCategories).map(([category, plots]) => [
                              <MenuItem key={`category-${category}`} disabled sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {category}
                              </MenuItem>,
                              ...plots.map((plot) => (
                                <MenuItem key={plot.value} value={plot.value} sx={{ pl: 3 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {plot.icon}
                                    <Box>
                                      <Typography variant="body2" fontWeight={500}>
                                        {plot.label}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {plot.description}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </MenuItem>
                              ))
                            ]).flat()}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>X-Axis</InputLabel>
                          <Select
                            value={chart.xAxis}
                            label="X-Axis"
                            onChange={(e) => updateChart(chart.id, { xAxis: e.target.value as string })}
                            fullWidth
                          >
                            {datasetInfo?.column_names.map((col) => (
                              <MenuItem key={col} value={col}>
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Y-Axis</InputLabel>
                          <Select
                            value={chart.yAxis}
                            label="Y-Axis"
                            onChange={(e) => updateChart(chart.id, { yAxis: e.target.value as string })}
                            fullWidth
                          >
                            {getNumericColumns().map((col) => (
                              <MenuItem key={col} value={col}>
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Color By</InputLabel>
                          <Select
                            value={chart.colorBy ?? ''}
                            label="Color By"
                            onChange={(e) => updateChart(chart.id, { colorBy: e.target.value as string })}
                            fullWidth
                          >
                            <MenuItem value="">(None)</MenuItem>
                            {datasetInfo?.column_names.map((col) => (
                              <MenuItem key={col} value={col}>
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Size By</InputLabel>
                          <Select
                            value={chart.sizeBy ?? ''}
                            label="Size By"
                            onChange={(e) => updateChart(chart.id, { sizeBy: e.target.value as string })}
                            fullWidth
                          >
                            <MenuItem value="">(None)</MenuItem>
                            {datasetInfo?.column_names.map((col) => (
                              <MenuItem key={col} value={col}>
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Group By</InputLabel>
                          <Select
                            value={chart.groupBy ?? ''}
                            label="Color By"
                            onChange={(e) => updateChart(chart.id, { groupBy: e.target.value as string })}
                            fullWidth
                          >
                            <MenuItem value="">(None)</MenuItem>
                            {datasetInfo?.column_names.map((col) => (
                              <MenuItem key={col} value={col}>
                                {col}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Aggregation</InputLabel>
                          <Select
                            value={chart.aggregation || ''}
                            label="Aggregation"
                            onChange={(e) => updateChart(chart.id, { aggregation: e.target.value as string })}
                            fullWidth
                          >
                            <MenuItem value="">None</MenuItem>
                            <MenuItem value="mean">Mean</MenuItem>
                            <MenuItem value="sum">Sum</MenuItem>
                            <MenuItem value="count">Count</MenuItem>
                            <MenuItem value="min">Min</MenuItem>
                            <MenuItem value="max">Max</MenuItem>
                          </Select>
                        </FormControl>
                        {chart.groupBy && (
                          <>
                            <FormControl fullWidth>
                              <InputLabel>Facet Mode</InputLabel>
                              <Select
                                value={chart.facetMode || 'none'}
                                label="Facet Mode"
                                onChange={(e) => updateChart(chart.id, { facetMode: e.target.value as any })}
                                fullWidth
                              >
                                <MenuItem value="none">Overlay</MenuItem>
                                <MenuItem value="grid">Grid (facets)</MenuItem>
                              </Select>
                            </FormControl>
                            {chart.facetMode === 'grid' && (
                              <TextField
                                label="Facet Columns"
                                type="number"
                                value={chart.facetCols}
                                onChange={(e) => updateChart(chart.id, { facetCols: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                                fullWidth
                              />
                            )}
                          </>
                        )}
                        <FormControl fullWidth>
                          <InputLabel>Theme</InputLabel>
                          <Select
                            value={chart.customizations.theme}
                            label="Theme"
                            onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, theme: e.target.value as string } })}
                            fullWidth
                          >
                            {themes.map((theme) => (
                              <MenuItem key={theme.value} value={theme.value}>
                                {theme.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth>
                          <InputLabel>Color Palette</InputLabel>
                          <Select
                            value={chart.customizations.colorPalette}
                            label="Color Palette"
                            onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, colorPalette: e.target.value as string } })}
                            fullWidth
                          >
                            {colorPalettes.map((palette) => (
                              <MenuItem key={palette.value} value={palette.value}>
                                {palette.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={chart.customizations.showGrid}
                              onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, showGrid: e.target.checked } })}
                              name="showGrid"
                            />
                          }
                          label="Show Grid"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={chart.customizations.showLegend}
                              onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, showLegend: e.target.checked } })}
                              name="showLegend"
                            />
                          }
                          label="Show Legend"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={chart.customizations.showLabels}
                              onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, showLabels: e.target.checked } })}
                              name="showLabels"
                            />
                          }
                          label="Show Labels"
                        />
                        <TextField
                          label="Font Size"
                          type="number"
                          value={chart.customizations.fontSize}
                          onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, fontSize: parseInt(e.target.value, 10) } })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">px</InputAdornment>,
                          }}
                          fullWidth
                        />
                        <TextField
                          label="Width"
                          type="number"
                          value={chart.customizations.width}
                          onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, width: parseInt(e.target.value, 10) } })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">px</InputAdornment>,
                          }}
                          fullWidth
                        />
                        <TextField
                          label="Height"
                          type="number"
                          value={chart.customizations.height}
                          onChange={(e) => updateChart(chart.id, { customizations: { ...chart.customizations, height: parseInt(e.target.value, 10) } })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">px</InputAdornment>,
                          }}
                          fullWidth
                        />
                      </Box>
                      {renderChartPreview(chart)}
                    </TabPanel>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Clear Cache Confirmation Dialog */}
      <Dialog open={showClearCacheDialog} onClose={() => setShowClearCacheDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Clear Cache & Reset</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This will clear all temporary versions and filtered data, keeping only your original uploaded datasets.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>What will be deleted:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>All filtered versions of datasets</li>
            <li>All temporary cached data</li>
            <li>All version history and metadata</li>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>What will be kept:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>Original uploaded datasets</li>
            <li>Persistent data files</li>
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Make sure you have saved any important filtered versions.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearCacheDialog(false)}>
            Cancel
          </Button>
          <Button onClick={clearCache} variant="contained" color="warning" disabled={loading}>
            {loading ? 'Clearing...' : 'Clear Cache'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chart-tabpanel-${index}`}
      aria-labelledby={`chart-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
        </div>
  );
};

export default DataVisualizer;
