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
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Chart type options
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: <BarChartIcon />, description: 'Categorical data comparison' },
    { value: 'line', label: 'Line Chart', icon: <LineChartIcon />, description: 'Trends over time or sequence' },
    { value: 'scatter', label: 'Scatter Plot', icon: <ScatterIcon />, description: 'Correlation between two variables' },
    { value: 'pie', label: 'Pie Chart', icon: <PieChartIcon />, description: 'Proportional composition' },
    { value: 'heatmap', label: 'Heatmap', icon: <HeatmapIcon />, description: 'Matrix data visualization' },
    { value: 'bubble', label: 'Bubble Chart', icon: <BubbleIcon />, description: 'Three-dimensional data' },
    { value: 'histogram', label: 'Histogram', icon: <BarChartIcon />, description: 'Distribution of values' },
    { value: 'box', label: 'Box Plot', icon: <BarChartIcon />, description: 'Statistical distribution' },
  ];

  // Theme options
  const themes = [
    { value: 'default', label: 'Default', description: 'Clean, professional look' },
    { value: 'dark', label: 'Dark Theme', description: 'High contrast, modern' },
    { value: 'light', label: 'Light Theme', description: 'Bright, clear visualization' },
    { value: 'minimal', label: 'Minimal', description: 'Simple, focused design' },
    { value: 'corporate', label: 'Corporate', description: 'Business presentation style' },
  ];

  // Color palettes
  const colorPalettes = [
    { value: 'default', label: 'Default', description: 'Standard color scheme' },
    { value: 'viridis', label: 'Viridis', description: 'Perceptually uniform' },
    { value: 'plasma', label: 'Plasma', description: 'High contrast sequential' },
    { value: 'inferno', label: 'Inferno', description: 'Dark to light gradient' },
    { value: 'magma', label: 'Magma', description: 'Smooth color transitions' },
    { value: 'cividis', label: 'Cividis', description: 'Colorblind friendly' },
  ];

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset) {
      fetchDatasetInfo(selectedDataset);
      fetchDatasetPreview(selectedDataset);
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

  const fetchDatasetPreview = async (datasetId: string, rows: number = 100) => {
    try {
      const response = await axios.get(`/dataset/${datasetId}/preview?rows=${rows}`);
      setPreviewData(response.data.preview_data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch preview data');
    }
  };

  const addChart = () => {
    const newChart: ChartConfig = {
      id: `chart_${Date.now()}`,
      type: 'bar',
      title: 'New Chart',
      xAxis: datasetInfo?.column_names[0] || '',
      yAxis: datasetInfo?.column_names[1] || '',
      customizations: {
        theme: 'default',
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
      
      // Prepare chart data based on type
      const chartData = prepareChartData(chart);
      
      // Generate plot using backend
      const response = await axios.post(`/visualize/${selectedDataset}/generate`, {
        chart_config: chart,
        data: chartData
      });

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
      
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to generate chart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (chart: ChartConfig) => {
    if (!previewData.length) return [];

    const { xAxis, yAxis, colorBy, sizeBy, groupBy, aggregation } = chart;
    
    // Basic data preparation
    let preparedData = previewData.map(row => ({
      x: row[xAxis],
      y: row[yAxis],
      color: colorBy ? row[colorBy] : undefined,
      size: sizeBy ? row[sizeBy] : undefined,
      group: groupBy ? row[groupBy] : undefined,
    }));

    // Apply aggregation if specified
    if (aggregation && groupBy) {
      const grouped = preparedData.reduce((acc, item) => {
        const key = item.group;
        if (!acc[key]) {
          acc[key] = { count: 0, sum: 0, values: [] };
        }
        acc[key].count++;
        acc[key].sum += Number(item.y) || 0;
        acc[key].values.push(item.y);
        return acc;
      }, {} as Record<string, any>);

      preparedData = Object.entries(grouped).map(([key, data]) => ({
        x: key,
        y: aggregation === 'sum' ? data.sum : 
           aggregation === 'count' ? data.count : 
           aggregation === 'mean' ? data.sum / data.count : data.sum,
        color: undefined,
        size: undefined,
        group: key,
      }));
    }

    return preparedData;
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

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getNumericColumns = () => {
    if (!datasetInfo) return [];
    return datasetInfo.column_names.filter(col => {
      const stats = datasetInfo.summary_stats[col];
      return stats?.type === 'numeric';
    });
  };

  const getCategoricalColumns = () => {
    if (!datasetInfo) return [];
    return datasetInfo.column_names.filter(col => {
      const stats = datasetInfo.summary_stats[col];
      return stats?.type === 'categorical';
    });
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
          borderRadius: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            Click "Generate Chart" to create visualization
          </Typography>
        </Box>
      );
    }

    // For now, show a placeholder. In a real implementation, you'd render the actual chart
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: chart.customizations.height,
        backgroundColor: 'primary.light',
        borderRadius: 1,
        color: 'white'
      }}>
        <Typography variant="h6">
          {chart.title} - {chart.type.toUpperCase()}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <BarChartIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Data Visualizer
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Dataset Selection */}
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
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addChart}
                  disabled={!selectedDataset}
                >
                  Add Chart
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => selectedDataset && fetchDatasetPreview(selectedDataset)}
                  disabled={!selectedDataset}
                >
                  Refresh Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Chart Builder" icon={<TuneIcon />} />
          <Tab label="Gallery" icon={<ViewIcon />} />
          <Tab label="Customization" icon={<PaletteIcon />} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            /* Chart Builder Tab */
            <Box>
              <Typography variant="h6" gutterBottom>
                Create and Configure Charts
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
                <Grid container spacing={3}>
                  {charts.map((chart) => (
                    <Grid item xs={12} md={6} key={chart.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">{chart.title}</Typography>
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => generateChart(chart)}
                                disabled={loading || !selectedDataset}
                              >
                                <RefreshIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => removeChart(chart.id)}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </Box>
                          </Box>

                          {/* Chart Configuration */}
                          <Box sx={{ mb: 2 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Type</InputLabel>
                                  <Select
                                    value={chart.type}
                                    label="Type"
                                    onChange={(e) => updateChart(chart.id, { type: e.target.value })}
                                  >
                                    {chartTypes.map(type => (
                                      <MenuItem key={type.value} value={type.value}>
                                        {type.icon} {type.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Title"
                                  value={chart.title}
                                  onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>X Axis</InputLabel>
                                  <Select
                                    value={chart.xAxis}
                                    label="X Axis"
                                    onChange={(e) => updateChart(chart.id, { xAxis: e.target.value })}
                                  >
                                    {datasetInfo?.column_names.map(col => (
                                      <MenuItem key={col} value={col}>{col}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Y Axis</InputLabel>
                                  <Select
                                    value={chart.yAxis}
                                    label="Y Axis"
                                    onChange={(e) => updateChart(chart.id, { yAxis: e.target.value })}
                                  >
                                    {getNumericColumns().map(col => (
                                      <MenuItem key={col} value={col}>{col}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                          </Box>

                          {/* Chart Preview */}
                          {renderChartPreview(chart)}

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
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {activeTab === 1 && (
            /* Gallery Tab */
            <Box>
              <Typography variant="h6" gutterBottom>
                Chart Gallery & Templates
              </Typography>
              
              <Grid container spacing={3}>
                {chartTypes.map((chartType) => (
                  <Grid item xs={12} md={4} key={chartType.value}>
                    <Card sx={{ cursor: 'pointer', '&:hover': { elevation: 4 } }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          {chartType.icon}
                          <Typography variant="h6" sx={{ ml: 1 }}>
                            {chartType.label}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {chartType.description}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            addChart();
                            // Set the new chart to this type
                            const newChart = charts[charts.length - 1];
                            if (newChart) {
                              updateChart(newChart.id, { type: chartType.value });
                            }
                          }}
                          disabled={!selectedDataset}
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {activeTab === 2 && (
            /* Customization Tab */
            <Box>
              <Typography variant="h6" gutterBottom>
                Chart Customization & Themes
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Theme Settings
                      </Typography>
                      
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Theme</InputLabel>
                        <Select
                          value={charts[0]?.customizations.theme || 'default'}
                          label="Theme"
                          onChange={(e) => {
                            charts.forEach(chart => {
                              updateChart(chart.id, {
                                customizations: { ...chart.customizations, theme: e.target.value }
                              });
                            });
                          }}
                        >
                          {themes.map(theme => (
                            <MenuItem key={theme.value} value={theme.value}>
                              {theme.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Color Palette</InputLabel>
                        <Select
                          value={charts[0]?.customizations.colorPalette || 'default'}
                          label="Color Palette"
                          onChange={(e) => {
                            charts.forEach(chart => {
                              updateChart(chart.id, {
                                customizations: { ...chart.customizations, colorPalette: e.target.value }
                              });
                            });
                          }}
                        >
                          {colorPalettes.map(palette => (
                            <MenuItem key={palette.value} value={palette.value}>
                              {palette.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Typography gutterBottom>Opacity</Typography>
                      <Slider
                        value={charts[0]?.customizations.opacity || 0.8}
                        onChange={(e, value) => {
                          charts.forEach(chart => {
                            updateChart(chart.id, {
                              customizations: { ...chart.customizations, opacity: value as number }
                            });
                          });
                        }}
                        min={0.1}
                        max={1}
                        step={0.1}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Display Options
                      </Typography>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={charts[0]?.customizations.showGrid || false}
                            onChange={(e) => {
                              charts.forEach(chart => {
                                updateChart(chart.id, {
                                  customizations: { ...chart.customizations, showGrid: e.target.checked }
                                });
                              });
                            }}
                          />
                        }
                        label="Show Grid"
                        sx={{ mb: 1 }}
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={charts[0]?.customizations.showLegend || false}
                            onChange={(e) => {
                              charts.forEach(chart => {
                                updateChart(chart.id, {
                                  customizations: { ...chart.customizations, showLegend: e.target.checked }
                                });
                              });
                            }}
                          />
                        }
                        label="Show Legend"
                        sx={{ mb: 1 }}
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={charts[0]?.customizations.showLabels || false}
                            onChange={(e) => {
                              charts.forEach(chart => {
                                updateChart(chart.id, {
                                  customizations: { ...chart.customizations, showLabels: e.target.checked }
                                });
                              });
                            }}
                          />
                        }
                        label="Show Labels"
                        sx={{ mb: 1 }}
                      />

                      <Typography gutterBottom>Font Size</Typography>
                      <Slider
                        value={charts[0]?.customizations.fontSize || 12}
                        onChange={(e, value) => {
                          charts.forEach(chart => {
                            updateChart(chart.id, {
                              customizations: { ...chart.customizations, fontSize: value as number }
                            });
                          });
                        }}
                        min={8}
                        max={24}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Card>

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

export default DataVisualizer;
