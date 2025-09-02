import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Explore as ExploreIcon,
  FilterList as FilterIcon,
  Transform as TransformIcon,
  Merge as MergeIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
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
  upload_time: string;
}

interface FilterConfig {
  column: string;
  type: string;
  value: any;
  enabled: boolean;
}

interface TransformationConfig {
  type: string;
  config: any;
  enabled: boolean;
}

const DataExplorer: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [datasetInfo, setDatasetInfo] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [transformations, setTransformations] = useState<TransformationConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      initializeFilters(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch dataset info');
    }
  };

  const fetchDatasetPreview = async (datasetId: string, rows: number = 20) => {
    try {
      const response = await axios.get(`/dataset/${datasetId}/preview?rows=${rows}`);
      setPreviewData(response.data.preview_data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch preview data');
    }
  };

  const initializeFilters = (dataset: Dataset) => {
    const initialFilters: FilterConfig[] = dataset.column_names.map(col => ({
      column: col,
      type: 'equals',
      value: '',
      enabled: false,
    }));
    setFilters(initialFilters);
  };

  const addFilter = () => {
    if (datasetInfo) {
      const newFilter: FilterConfig = {
        column: datasetInfo.column_names[0],
        type: 'equals',
        value: '',
        enabled: true,
      };
      setFilters(prev => [...prev, newFilter]);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof FilterConfig, value: any) => {
    setFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, [field]: value } : filter
    ));
  };

  const addTransformation = () => {
    const newTransform: TransformationConfig = {
      type: 'rename_column',
      config: { old_name: '', new_name: '' },
      enabled: true,
    };
    setTransformations(prev => [...prev, newTransform]);
  };

  const removeTransformation = (index: number) => {
    setTransformations(prev => prev.filter((_, i) => i !== index));
  };

  const updateTransformation = (index: number, field: string, value: any) => {
    setTransformations(prev => prev.map((transform, i) => 
      i === index ? { ...transform, config: { ...transform.config, [field]: value } } : transform
    ));
  };

  const applyFilters = async () => {
    if (!selectedDataset) return;

    try {
      setLoading(true);
      const activeFilters = filters.filter(f => f.enabled);
      
      if (activeFilters.length === 0) {
        fetchDatasetPreview(selectedDataset);
        return;
      }

      const filterConfig: Record<string, any> = {};
      activeFilters.forEach(filter => {
        filterConfig[filter.column] = {
          type: filter.type,
          value: filter.value,
        };
      });

      const response = await axios.post(`/data/${selectedDataset}/filter`, filterConfig);
      setPreviewData(response.data.preview_data);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply filters');
    } finally {
      setLoading(false);
    }
  };

  const applyTransformations = async () => {
    if (!selectedDataset) return;

    try {
      setLoading(true);
      const activeTransformations = transformations.filter(t => t.enabled);
      
      if (activeTransformations.length === 0) return;

      const response = await axios.post(`/data/${selectedDataset}/transform`, activeTransformations);
      
      // Refresh dataset info and preview
      await fetchDatasetInfo(selectedDataset);
      await fetchDatasetPreview(selectedDataset);
      
      // Clear transformations after successful application
      setTransformations([]);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply transformations');
    } finally {
      setLoading(false);
    }
  };

  const getFilterTypeOptions = (columnType: string) => {
    const baseOptions = [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'is_null', label: 'Is Null' },
      { value: 'not_null', label: 'Not Null' },
    ];

    if (columnType === 'numeric') {
      return [
        ...baseOptions,
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'between', label: 'Between' },
      ];
    }

    if (columnType === 'categorical') {
      return [
        ...baseOptions,
        { value: 'contains', label: 'Contains' },
        { value: 'in_list', label: 'In List' },
      ];
    }

    if (columnType === 'datetime') {
      return [
        ...baseOptions,
        { value: 'greater_than', label: 'After' },
        { value: 'less_than', label: 'Before' },
        { value: 'between', label: 'Between' },
      ];
    }

    return baseOptions;
  };

  const getColumnType = (columnName: string) => {
    if (!datasetInfo) return 'categorical';
    const stats = datasetInfo.summary_stats[columnName];
    return stats?.type || 'categorical';
  };

  const renderFilterValueInput = (filter: FilterConfig) => {
    const columnType = getColumnType(filter.column);
    
    if (filter.type === 'is_null' || filter.type === 'not_null') {
      return null;
    }

    if (filter.type === 'between') {
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Min"
            value={filter.value?.min || ''}
            onChange={(e) => updateFilter(
              filters.findIndex(f => f === filter),
              'value',
              { ...filter.value, min: e.target.value }
            )}
            sx={{ width: 120 }}
          />
          <Typography variant="body2">to</Typography>
          <TextField
            size="small"
            placeholder="Max"
            value={filter.value?.max || ''}
            onChange={(e) => updateFilter(
              filters.findIndex(f => f === filter),
              'value',
              { ...filter.value, max: e.target.value }
            )}
            sx={{ width: 120 }}
          />
        </Box>
      );
    }

    if (filter.type === 'in_list') {
      return (
        <TextField
          size="small"
          placeholder="Value1, Value2, Value3"
          value={filter.value || ''}
          onChange={(e) => updateFilter(
            filters.findIndex(f => f === filter),
            'value',
            e.target.value
          )}
          helperText="Separate values with commas"
          fullWidth
        />
      );
    }

    return (
      <TextField
        size="small"
        placeholder="Value"
        value={filter.value || ''}
        onChange={(e) => updateFilter(
          filters.findIndex(f => f === filter),
          'value',
          e.target.value
        )}
        fullWidth
      />
    );
  };

  const renderTransformationConfig = (transform: TransformationConfig) => {
    switch (transform.type) {
      case 'rename_column':
        return (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Column</InputLabel>
              <Select
                value={transform.config.old_name || ''}
                label="Column"
                onChange={(e) => updateTransformation(
                  transformations.findIndex(t => t === transform),
                  'old_name',
                  e.target.value
                )}
              >
                {datasetInfo?.column_names.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2">→</Typography>
            <TextField
              size="small"
              placeholder="New name"
              value={transform.config.new_name || ''}
              onChange={(e) => updateTransformation(
                transformations.findIndex(t => t === transform),
                'new_name',
                e.target.value
              )}
              sx={{ minWidth: 150 }}
            />
          </Box>
        );

      case 'drop_column':
        return (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Columns to drop</InputLabel>
            <Select
              multiple
              value={transform.config.columns || []}
              label="Columns to drop"
              onChange={(e) => updateTransformation(
                transformations.findIndex(t => t === transform),
                'columns',
                e.target.value
              )}
            >
              {datasetInfo?.column_names.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'fill_na':
        return (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Column</InputLabel>
              <Select
                value={transform.config.column || ''}
                label="Column"
                onChange={(e) => updateTransformation(
                  transformations.findIndex(t => t === transform),
                  'column',
                  e.target.value
                )}
              >
                {datasetInfo?.column_names.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Method</InputLabel>
              <Select
                value={transform.config.method || 'value'}
                label="Method"
                onChange={(e) => updateTransformation(
                  transformations.findIndex(t => t === transform),
                  'method',
                  e.target.value
                )}
              >
                <MenuItem value="value">Value</MenuItem>
                <MenuItem value="ffill">Forward Fill</MenuItem>
                <MenuItem value="bfill">Backward Fill</MenuItem>
              </Select>
            </FormControl>
            {transform.config.method === 'value' && (
              <TextField
                size="small"
                placeholder="Fill value"
                value={transform.config.fill_value || ''}
                onChange={(e) => updateTransformation(
                  transformations.findIndex(t => t === transform),
                  'fill_value',
                  e.target.value
                )}
                sx={{ minWidth: 120 }}
              />
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Explorer & Manipulation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Dataset Selection */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Dataset
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Dataset</InputLabel>
                <Select
                  value={selectedDataset}
                  label="Dataset"
                  onChange={(e) => setSelectedDataset(e.target.value)}
                >
                  {datasets.map(dataset => (
                    <MenuItem key={dataset.dataset_id} value={dataset.dataset_id}>
                      {dataset.filename} ({dataset.rows} × {dataset.columns})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {datasetInfo && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Dataset Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Rows:</strong> {datasetInfo.rows.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Columns:</strong> {datasetInfo.columns}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Upload Time:</strong> {new Date(datasetInfo.upload_time).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Data Preview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Data Preview
                </Typography>
                {selectedDataset && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => fetchDatasetPreview(selectedDataset)}
                  >
                    Refresh
                  </Button>
                )}
              </Box>

              {!selectedDataset ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Select a dataset to view preview
                </Typography>
              ) : loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {datasetInfo?.column_names.map(col => (
                          <TableCell key={col}>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {col}
                              </Typography>
                              <Chip 
                                label={datasetInfo.data_types[col]} 
                                size="small" 
                                variant="outlined"
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {datasetInfo?.column_names.map(col => (
                            <TableCell key={col}>
                              <Typography variant="body2" noWrap>
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'null'}
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Data Filters
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addFilter}
                    sx={{ mr: 1 }}
                  >
                    Add Filter
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={applyFilters}
                    disabled={!selectedDataset || loading}
                  >
                    Apply Filters
                  </Button>
                </Box>
              </Box>

              {filters.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No filters configured. Add a filter to start filtering your data.
                </Typography>
              ) : (
                <Box>
                  {filters.map((filter, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={filter.enabled}
                              onChange={(e) => updateFilter(index, 'enabled', e.target.checked)}
                            />
                          }
                          label=""
                        />
                        
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel>Column</InputLabel>
                          <Select
                            value={filter.column}
                            label="Column"
                            onChange={(e) => updateFilter(index, 'column', e.target.value)}
                          >
                            {datasetInfo?.column_names.map(col => (
                              <MenuItem key={col} value={col}>{col}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={filter.type}
                            label="Type"
                            onChange={(e) => updateFilter(index, 'type', e.target.value)}
                          >
                            {getFilterTypeOptions(getColumnType(filter.column)).map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <Box sx={{ flexGrow: 1 }}>
                          {renderFilterValueInput(filter)}
                        </Box>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeFilter(index)}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Transformations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <TransformIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Data Transformations
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addTransformation}
                    sx={{ mr: 1 }}
                  >
                    Add Transformation
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={applyTransformations}
                    disabled={!selectedDataset || loading || transformations.length === 0}
                  >
                    Apply Transformations
                  </Button>
                </Box>
              </Box>

              {transformations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No transformations configured. Add transformations to modify your data.
                </Typography>
              ) : (
                <Box>
                  {transformations.map((transform, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={transform.enabled}
                              onChange={(e) => updateTransformation(index, 'enabled', e.target.checked)}
                            />
                          }
                          label=""
                        />
                        
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={transform.type}
                            label="Type"
                            onChange={(e) => updateTransformation(index, 'type', e.target.value)}
                          >
                            <MenuItem value="rename_column">Rename Column</MenuItem>
                            <MenuItem value="drop_column">Drop Column</MenuItem>
                            <MenuItem value="fill_na">Fill Missing Values</MenuItem>
                            <MenuItem value="drop_na">Drop Missing Values</MenuItem>
                            <MenuItem value="sort_values">Sort Values</MenuItem>
                            <MenuItem value="reset_index">Reset Index</MenuItem>
                          </Select>
                        </FormControl>

                        <Box sx={{ flexGrow: 1 }}>
                          {renderTransformationConfig(transform)}
                        </Box>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeTransformation(index)}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataExplorer; 