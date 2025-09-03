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
} from '@mui/icons-material';
import axios from 'axios';

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
  summary_stats: Record<string, any>;
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
  data: any;
  config: ChartConfig;
  timestamp: number;
}

// Chart type definitions
const chartTypes = [
  { value: 'bar', label: 'Bar Chart', icon: <BarChartIcon />, description: 'Vertical or horizontal bars for categorical data' },
  { value: 'line', label: 'Line Chart', icon: <LineChartIcon />, description: 'Connected points for trends over time' },
  { value: 'scatter', label: 'Scatter Plot', icon: <ScatterIcon />, description: 'Points for correlation between variables' },
  { value: 'pie', label: 'Pie Chart', icon: <PieChartIcon />, description: 'Circular segments for proportions' },
  { value: 'heatmap', label: 'Heatmap', icon: <HeatmapIcon />, description: 'Color-coded matrix for correlations' },
  { value: 'bubble', label: 'Bubble Chart', icon: <BubbleIcon />, description: 'Bubbles with size representing third variable' },
  { value: 'histogram', label: 'Histogram', icon: <TimelineIcon />, description: 'Bars for distribution of values' },
  { value: 'box', label: 'Box Plot', icon: <TableIcon />, description: 'Statistical summary with quartiles' },
];

// Theme and color options
const themes = [
  { value: 'plotly_white', label: 'Plotly White' },
  { value: 'plotly_dark', label: 'Plotly Dark' },
  { value: 'simple_white', label: 'Simple White' },
  { value: 'ggplot2', label: 'ggplot2' },
  { value: 'seaborn', label: 'Seaborn' },
];

const colorPalettes = [
  { value: 'default', label: 'Default' },
  { value: 'viridis', label: 'Viridis' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'magma', label: 'Magma' },
  { value: 'cividis', label: 'Cividis' },
];

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
    }
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
      const response = await axios.get(`/dataset/${selectedDataset}`);
      setDatasetInfo(response.data);
    } catch (err: any) {
      console.error('Failed to fetch dataset info:', err);
      setError('Failed to load dataset information');
    }
  };

  const fetchDatasetPreview = async () => {
    try {
      const response = await axios.get(`/data/${selectedDataset}/preview?rows=100`);
      setPreviewData(response.data.preview || []);
    } catch (err: any) {
      console.error('Failed to fetch dataset preview:', err);
      setError('Failed to load dataset preview');
    }
  };

  const getNumericColumns = () => {
    if (!datasetInfo) return [];
    return datasetInfo.column_names.filter(col => {
      const dataType = datasetInfo.data_types[col];
      return dataType === 'int64' || dataType === 'float64' || dataType === 'number';
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const addChart = () => {
    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      type: 'bar',
      title: `New Chart ${charts.length + 1}`,
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

    try {
      setLoading(true);
      setError(null);
      
      console.log('Generating chart with config:', chart);
      
      // Generate plot using backend - send only the chart config
      const response = await axios.post(`/visualize/${selectedDataset}/generate`, chart);

      console.log('Backend response:', response.data);

      // Update plot data
      const newPlot: PlotData = {
        chartId: chart.id,
        data: response.data.plot_data,
        config: chart,
        timestamp: Date.now()
      };

      setPlotData(prev => {
        const filtered = prev.filter(plot => plot.chartId !== chart.id);
        return [...filtered, newPlot];
      });

      showSnackbar('Chart generated successfully', 'success');
      
      // Render the chart after a short delay to ensure DOM is ready
      setTimeout(() => {
        renderChartToDOM(chart.id, response.data.plot_data);
      }, 100);
      
    } catch (err: any) {
      console.error('Chart generation error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to generate chart';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateTestChart = async () => {
    if (!selectedDataset) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Generating test chart...');
      
      const response = await axios.post(`/visualize/${selectedDataset}/test`);

      console.log('Test chart response:', response.data);

      // Update plot data with test chart
      const newPlot: PlotData = {
        chartId: 'test_chart',
        data: response.data.plot_data,
        config: {
          id: 'test_chart',
          type: 'scatter',
          title: 'Test Chart',
          xAxis: response.data.test_info.x_column,
          yAxis: response.data.test_info.y_column,
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
      
      // Render the test chart
      setTimeout(() => {
        renderChartToDOM('test_chart', response.data.plot_data);
      }, 100);
      
    } catch (err: any) {
      console.error('Test chart generation error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to generate test chart';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderChartToDOM = (chartId: string, plotData: any) => {
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
      console.log(`Rendering chart ${chartId} with data:`, plotData);
      
      // Clear the container
      chartContainer.innerHTML = '';
      
      // Create the chart
      window.Plotly.newPlot(chartContainer, plotData.data, plotData.layout, {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        displaylogo: false
      });
      
      console.log(`Chart ${chartId} rendered successfully`);
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

    // Render the chart container
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
                      {dataset.filename}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {datasetInfo && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1">
                    <strong>Dataset:</strong> {datasetInfo.filename}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rows: {datasetInfo.rows}, Columns: {datasetInfo.columns}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Data Types: {Object.entries(datasetInfo.data_types).map(([col, type]) => `${col}: ${type}`).join(', ')}
                  </Typography>
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
                            {chart.title}
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
                        <Typography variant="h6">{chart.title}</Typography>
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
                            {chartTypes.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                {type.label}
                              </MenuItem>
                            ))}
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
                            value={chart.colorBy}
                            label="Color By"
                            onChange={(e) => updateChart(chart.id, { colorBy: e.target.value as string })}
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
                          <InputLabel>Size By</InputLabel>
                          <Select
                            value={chart.sizeBy}
                            label="Size By"
                            onChange={(e) => updateChart(chart.id, { sizeBy: e.target.value as string })}
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
                          <InputLabel>Group By</InputLabel>
                          <Select
                            value={chart.groupBy}
                            label="Group By"
                            onChange={(e) => updateChart(chart.id, { groupBy: e.target.value as string })}
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
                          <InputLabel>Aggregation</InputLabel>
                          <Select
                            value={chart.aggregation}
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
