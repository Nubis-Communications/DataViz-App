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
  TablePagination,
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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Explore as ExploreIcon,
  FilterList as FilterIcon,
  Transform as TransformIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  SaveAlt as SaveAltIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Edit as EditIcon,
  AddBox as AddRowIcon,
  AddCircle as AddColumnIcon,
  ContentCopy as CopyIcon,
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
  
  // Enhanced state for live data view and filtering
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [showFullTable, setShowFullTable] = useState(false);
  const [showHead, setShowHead] = useState(true); // true for head(5), false for tail(5)
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Data manipulation states
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [showAddRowDialog, setShowAddRowDialog] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [newColumnConfig, setNewColumnConfig] = useState({ name: '', type: 'categorical', formula: '' });
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // UI states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  // Dataset merge/append states
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showConcatDialog, setShowConcatDialog] = useState(false);
  const [mergeConfig, setMergeConfig] = useState({
    leftDataset: '',
    rightDataset: '',
    how: 'inner' as 'inner' | 'left' | 'right' | 'outer',
    joinColumns: [] as string[],
    leftColumns: [] as string[],
    rightColumns: [] as string[]
  });
  const [concatConfig, setConcatConfig] = useState({
    selectedDatasets: [] as string[],
    axis: 0 as 0 | 1,
    ignoreIndex: true
  });
  const [availableColumns, setAvailableColumns] = useState<Record<string, string[]>>({});
  
  // Dataset history for undo/redo
  const [datasetHistory, setDatasetHistory] = useState<any[]>([]);
  const [currentDatasetIndex, setCurrentDatasetIndex] = useState(-1);

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (datasets.length > 0) {
      fetchAllColumnInfo();
    }
  }, [datasets]);

  useEffect(() => {
    if (selectedDataset) {
      fetchDatasetInfo(selectedDataset);
      fetchDatasetPreview(selectedDataset);
    }
  }, [selectedDataset]);

  // Real-time filtering effect
  useEffect(() => {
    if (previewData.length > 0) {
      applyFiltersInMemory();
    }
  }, [previewData, filters, searchTerm, sortConfig]);

  // Initialize filteredData when previewData changes
  useEffect(() => {
    if (previewData.length > 0) {
      setFilteredData(previewData);
    }
  }, [previewData]);

  const fetchDatasets = async () => {
    try {
      const response = await axios.get('/datasets');
      setDatasets(response.data.datasets);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch datasets');
    }
  };

  const fetchAllColumnInfo = async () => {
    try {
      const columnInfo: Record<string, string[]> = {};
      for (const dataset of datasets) {
        const response = await axios.get(`/dataset/${dataset.dataset_id}`);
        columnInfo[dataset.dataset_id] = response.data.column_names || [];
      }
      setAvailableColumns(columnInfo);
    } catch (error) {
      console.error('Error fetching column info:', error);
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

  const fetchDatasetPreview = async (datasetId: string, rows: number = 100) => {
    try {
      const response = await axios.get(`/dataset/${datasetId}/preview?rows=${rows}`);
      setPreviewData(response.data.preview_data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch preview data');
    }
  };

  const initializeFilters = (dataset: Dataset) => {
    // Show only first column filter by default
    const initialFilters: FilterConfig[] = dataset.column_names.map((col, index) => ({
      column: col,
      type: 'equals',
      value: '',
      enabled: index === 0, // Only first column enabled by default
    }));
    setFilters(initialFilters);
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

  // Enhanced filtering and data manipulation functions
  const applyFiltersInMemory = () => {
    let result = [...previewData];
    
    // Apply search term
    if (searchTerm) {
      result = result.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply filters
    const activeFilters = filters.filter(f => f.enabled);
    activeFilters.forEach(filter => {
      result = result.filter(row => {
        const value = row[filter.column];
        switch (filter.type) {
          case 'equals':
            return String(value) === String(filter.value);
          case 'not_equals':
            return String(value) !== String(filter.value);
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filter.value);
          case 'less_than':
            return Number(value) < Number(filter.value);
          case 'is_null':
            return value === null || value === undefined || value === '';
          case 'not_null':
            return value !== null && value !== undefined && value !== '';
          default:
            return true;
        }
      });
    });
    
    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.column];
        const bVal = b[sortConfig.column];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    setFilteredData(result);
    setPage(0); // Reset to first page when filtering
  };

  // Get display data based on view mode
  const getDisplayData = () => {
    if (showFullTable) {
      return filteredData;
    } else {
      // Show head(5) or tail(5) based on toggle
      const data = filteredData.length > 0 ? filteredData : previewData;
      if (showHead) {
        return data.slice(0, 5);
      } else {
        return data.slice(-5);
      }
    }
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const handleRowSelection = (rowIndex: number) => {
    setSelectedRows(prev => 
      prev.includes(rowIndex) 
        ? prev.filter(i => i !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  const handleSelectAllRows = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map((_, index) => index));
    }
  };

  const startCellEdit = (rowIndex: number, col: string) => {
    setEditingCell({ row: rowIndex, col });
  };

  const saveCellEdit = (rowIndex: number, col: string, value: any) => {
    const newData = [...filteredData];
    newData[rowIndex] = { ...newData[rowIndex], [col]: value };
    setFilteredData(newData);
    setEditingCell(null);
    setHasUnsavedChanges(true);
    
    // Add to edit history
    setEditHistory(prev => [...prev, { row: rowIndex, col, oldValue: previewData[rowIndex][col], newValue: value }]);
    setUndoStack(prev => [...prev, { row: rowIndex, col, oldValue: previewData[rowIndex][col], newValue: value }]);
    setRedoStack([]); // Clear redo stack when new edit is made
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
  };

  const addNewColumn = () => {
    if (!newColumnConfig.name) return;
    
    const newData = filteredData.map(row => ({
      ...row,
      [newColumnConfig.name]: newColumnConfig.type === 'numeric' ? 0 : ''
    }));
    
    setFilteredData(newData);
    setShowAddColumnDialog(false);
    setNewColumnConfig({ name: '', type: 'categorical', formula: '' });
    setHasUnsavedChanges(true);
    showSnackbar('Column added successfully', 'success');
  };

  const addNewRow = () => {
    const newRow: Record<string, any> = {};
    datasetInfo?.column_names.forEach(col => {
      newRow[col] = '';
    });
    
    setFilteredData(prev => [...prev, newRow]);
    setShowAddRowDialog(false);
    setNewRowData({});
    setHasUnsavedChanges(true);
    showSnackbar('Row added successfully', 'success');
  };

  const deleteSelectedRows = () => {
    setFilteredData(prev => prev.filter((_, index) => !selectedRows.includes(index)));
    setSelectedRows([]);
    setHasUnsavedChanges(true);
    showSnackbar('Selected rows deleted', 'success');
  };

  const duplicateSelectedRows = () => {
    const rowsToDuplicate = filteredData.filter((_, index) => selectedRows.includes(index));
    setFilteredData(prev => [...prev, ...rowsToDuplicate]);
    setHasUnsavedChanges(true);
    showSnackbar('Selected rows duplicated', 'success');
  };

  const undoLastEdit = () => {
    if (undoStack.length === 0) return;
    
    const lastEdit = undoStack[undoStack.length - 1];
    const newData = [...filteredData];
    newData[lastEdit.row] = { ...newData[lastEdit.row], [lastEdit.col]: lastEdit.oldValue };
    setFilteredData(newData);
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastEdit]);
    setHasUnsavedChanges(true);
  };

  const redoLastEdit = () => {
    if (redoStack.length === 0) return;
    
    const lastEdit = redoStack[redoStack.length - 1];
    const newData = [...filteredData];
    newData[lastEdit.row] = { ...newData[lastEdit.row], [lastEdit.col]: lastEdit.newValue };
    setFilteredData(newData);
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastEdit]);
    setHasUnsavedChanges(true);
  };

  const undoDatasetChange = () => {
    if (currentDatasetIndex > 0) {
      const newIndex = currentDatasetIndex - 1;
      setCurrentDatasetIndex(newIndex);
      const previousState = datasetHistory[newIndex];
      setPreviewData(previousState.data);
      setFilteredData(previousState.data);
      setFilters(previousState.filters);
      showSnackbar('Dataset change undone', 'success');
    }
  };

  const handleMerge = async () => {
    try {
      const payload: any = {
        target_dataset_id: mergeConfig.rightDataset,
        how: mergeConfig.how
      };
      
      if (mergeConfig.joinColumns.length > 0) {
        payload.on = mergeConfig.joinColumns;
      } else if (mergeConfig.leftColumns.length > 0 && mergeConfig.rightColumns.length > 0) {
        payload.left_on = mergeConfig.leftColumns;
        payload.right_on = mergeConfig.rightColumns;
      }
      
      const response = await axios.post(`/data/${mergeConfig.leftDataset}/merge`, payload);
      const newId = response.data.new_dataset_id;
      
      await fetchDatasets();
      await fetchAllColumnInfo();
      setSelectedDataset(newId);
      setShowMergeDialog(false);
      showSnackbar('Datasets merged successfully', 'success');
    } catch (error) {
      console.error('Merge failed:', error);
      showSnackbar('Merge failed. Please check your configuration.', 'error');
    }
  };

  const handleAppend = async () => {
    try {
      const payload = {
        source_datasets: concatConfig.selectedDatasets,
        axis: concatConfig.axis,
        ignore_index: concatConfig.ignoreIndex
      };
      
      // Use the first selected dataset as the base for the endpoint
      const baseDatasetId = concatConfig.selectedDatasets[0];
      const response = await axios.post(`/data/${baseDatasetId}/concatenate`, payload);
      const newId = response.data.new_dataset_id;
      
      await fetchDatasets();
      await fetchAllColumnInfo();
      setSelectedDataset(newId);
      setShowConcatDialog(false);
      showSnackbar('Datasets appended successfully', 'success');
    } catch (error) {
      console.error('Append failed:', error);
      showSnackbar('Append failed. Please check your configuration.', 'error');
    }
  };

  const saveAllChanges = async () => {
    try {
      // Here you would typically send the updated data to the backend
      // For now, we'll just update the local state
      setPreviewData([...filteredData]);
      setHasUnsavedChanges(false);
      showSnackbar('Changes saved successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to save changes', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Pagination helpers
  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  const getAvailableColumns = () => {
    if (!datasetInfo) return [];
    // Get columns that are not already used in filters
    const usedColumns = filters.map(f => f.column);
    return datasetInfo.column_names.filter(col => !usedColumns.includes(col));
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

      // Persist filters as a transformation so state remains when navigating
      await axios.post(`/data/${selectedDataset}/transform`, [
        { type: 'apply_filters', config: { filters: filterConfig }, enabled: true }
      ]);
      showSnackbar('Filters applied and saved', 'success');
      
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
      
      // Show success message
      showSnackbar('Transformations applied successfully!', 'success');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply transformations');
      showSnackbar('Failed to apply transformations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueValues = (column: string): string[] => {
    const values = new Set<string>();
    (previewData || []).forEach(row => {
      const v = row[column];
      if (v !== null && v !== undefined && v !== '') values.add(String(v));
    });
    return Array.from(values).slice(0, 200);
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
          value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
          onChange={(e) => updateFilter(
            filters.findIndex(f => f === filter),
            'value',
            e.target.value.split(',').map(v => v.trim())
          )}
          sx={{ width: 200 }}
          helperText="Separate values with commas"
        />
      );
    }

    const uniqueValues = getUniqueValues(filter.column);
    return (
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Value</InputLabel>
        <Select
          value={filter.value || ''}
          label="Value"
          onChange={(e) => updateFilter(
            filters.findIndex(f => f === filter),
            'value',
            e.target.value
          )}
          renderValue={(val) => String(val)}
        >
          {uniqueValues.map(v => (
            <MenuItem key={v} value={v}>{v}</MenuItem>
          ))}
        </Select>
      </FormControl>
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <ExploreIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
        Data Explorer
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

        {/* Edit Status and Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Edit Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* hasUnsavedChanges, saveAllChanges, undoLastEdit, undoStack, redoStack, closeSnackbar, snackbar */}
                {/* These states and functions are not defined in the original file,
                    so they are commented out to avoid errors.
                    If they were intended to be added, they would need to be initialized. */}
                {/* {hasUnsavedChanges && (
                  <Chip 
                    icon={<WarningIcon />} 
                    label={`${editHistory.length} unsaved changes`} 
                    color="warning" 
                    variant="outlined"
                  />
                )} */}
                {/* <Button
                  variant="contained"
                  startIcon={<SaveAltIcon />}
                  onClick={saveAllChanges}
                  disabled={!hasUnsavedChanges || loading}
                  color="primary"
                >
                  Save All Changes
                </Button> */}
                {/* <Button
                  variant="outlined"
                  startIcon={<UndoIcon />}
                  onClick={undoLastEdit}
                  disabled={undoStack.length === 0}
                >
                  Undo
                </Button> */}
                {/* <Button
                  variant="outlined"
                  startIcon={<RedoIcon />}
                  onClick={redoLastEdit}
                  disabled={redoStack.length === 0}
                >
                  Redo
                </Button> */}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Enhanced Data Table */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <ViewIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Live Data View
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {!showFullTable && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">View:</Typography>
                    <Button
                      variant={showHead ? "contained" : "outlined"}
                      size="small"
                      onClick={() => setShowHead(true)}
                    >
                      Head(5)
                    </Button>
                    <Button
                      variant={!showHead ? "contained" : "outlined"}
                      size="small"
                      onClick={() => setShowHead(false)}
                    >
                      Tail(5)
                    </Button>
                  </Box>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={showFullTable}
                      onChange={(e) => setShowFullTable(e.target.checked)}
                    />
                  }
                  label="Full Table View"
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UndoIcon />}
                  onClick={undoLastEdit}
                  disabled={undoStack.length === 0}
                  title="Undo last edit"
                >
                  Undo
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RedoIcon />}
                  onClick={redoLastEdit}
                  disabled={redoStack.length === 0}
                  title="Redo last edit"
                >
                  Redo
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => fetchDatasetPreview(selectedDataset)}
                  disabled={!selectedDataset || loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SaveAltIcon />}
                  onClick={() => {}}
                  disabled={!selectedDataset}
                >
                  Export
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowMergeDialog(true)}
                  disabled={datasets.length < 2}
                >
                  Merge
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowConcatDialog(true)}
                  disabled={datasets.length < 2}
                >
                  Append
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UndoIcon />}
                  onClick={undoDatasetChange}
                  disabled={datasetHistory.length < 2}
                >
                  Undo Dataset
                </Button>
                {hasUnsavedChanges && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={saveAllChanges}
                    color="primary"
                  >
                    Save Changes
                  </Button>
                )}
              </Box>
            </Box>

                         {/* Search and Quick Actions */}
             <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
               <TextField
                 size="small"
                 placeholder="Search in all columns..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 InputProps={{
                   startAdornment: (
                     <InputAdornment position="start">
                       <SearchIcon />
                     </InputAdornment>
                   ),
                 }}
                 sx={{ minWidth: 300 }}
               />
               
               {/* Status Indicators */}
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                 <Chip 
                   label={`${getDisplayData().length} of ${previewData.length} rows`}
                   color="primary"
                   variant="outlined"
                   size="small"
                 />
                 {!showFullTable && (
                   <Chip 
                     label={showHead ? "Head(5)" : "Tail(5)"}
                     color="secondary"
                     variant="outlined"
                     size="small"
                   />
                 )}
                 {hasUnsavedChanges && (
                   <Chip 
                     label="Unsaved Changes"
                     color="warning"
                     variant="filled"
                     size="small"
                   />
                 )}
               </Box>
             </Box>

            {/* Side by Side Layout: Filters + Table */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Filters Panel - Narrow Space */}
              <Box sx={{ width: 320, flexShrink: 0 }}>
                <Paper sx={{ p: 2, height: 'fit-content' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                    <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Quick Filters
                  </Typography>
                  
                                     {/* Show only first few filters by default */}
                   {filters.slice(0, showFullTable ? filters.length : 3).map((filter, index) => (
                     <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                         <FormControlLabel
                           control={
                             <Switch
                               size="small"
                               checked={filter.enabled}
                               onChange={(e) => updateFilter(index, 'enabled', e.target.checked)}
                             />
                           }
                           label=""
                         />
                         <FormControl size="small" sx={{ minWidth: 120, flexGrow: 1 }}>
                           <Select
                             value={filter.column}
                             onChange={(e) => updateFilter(index, 'column', e.target.value)}
                             size="small"
                           >
                             {datasetInfo?.column_names.map(col => (
                               <MenuItem key={col} value={col}>{col}</MenuItem>
                             ))}
                           </Select>
                         </FormControl>
                         <IconButton
                           size="small"
                           color="error"
                           onClick={() => removeFilter(index)}
                         >
                           <RemoveIcon fontSize="small" />
                         </IconButton>
                       </Box>
                       
                       {filter.enabled && (
                         <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                           <FormControl size="small">
                             <Select
                               value={filter.type}
                               onChange={(e) => updateFilter(index, 'type', e.target.value)}
                               size="small"
                             >
                               {getFilterTypeOptions(getColumnType(filter.column)).map(option => (
                                 <MenuItem key={option.value} value={option.value}>
                                   {option.label}
                                 </MenuItem>
                               ))}
                             </Select>
                           </FormControl>
                           {renderFilterValueInput(filter)}
                         </Box>
                       )}
                     </Box>
                   ))}
                  
                  {!showFullTable && filters.length > 3 && (
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setShowFullTable(true)}
                      sx={{ mt: 1 }}
                    >
                      Show More Filters ({filters.length - 3} hidden)
                    </Button>
                  )}
                  
                                                        <Button
                     variant="outlined"
                     size="small"
                     startIcon={<AddIcon />}
                     onClick={addFilter}
                     fullWidth
                     disabled={getAvailableColumns().length === 0}
                     sx={{ mt: 1 }}
                   >
                     Add Filter ({getAvailableColumns().length} available)
                   </Button>

                   {/* Data Manipulation Buttons */}
                   <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                     <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                       Data Actions
                     </Typography>
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                       <Button
                         variant="outlined"
                         size="small"
                         startIcon={<AddRowIcon />}
                         onClick={() => setShowAddRowDialog(true)}
                         disabled={!selectedDataset}
                         fullWidth
                       >
                         Add Row
                       </Button>
                       <Button
                         variant="outlined"
                         size="small"
                         startIcon={<AddColumnIcon />}
                         onClick={() => setShowAddColumnDialog(true)}
                         disabled={!selectedDataset}
                         fullWidth
                       >
                         Add Column
                       </Button>
                       <Button
                         variant="outlined"
                         size="small"
                         startIcon={<CopyIcon />}
                         onClick={duplicateSelectedRows}
                         disabled={selectedRows.length === 0}
                         fullWidth
                       >
                         Duplicate
                       </Button>
                       <Button
                         variant="contained"
                         size="small"
                         color="error"
                         onClick={deleteSelectedRows}
                         disabled={selectedRows.length === 0}
                         fullWidth
                       >
                         Delete
                       </Button>
                     </Box>
                   </Box>
                 </Paper>
               </Box>

              {/* Data Table - Main Space */}
              <Box sx={{ flexGrow: 1 }}>
                {filteredData.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                indeterminate={selectedRows.length > 0 && selectedRows.length < filteredData.length}
                                checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                                onChange={handleSelectAllRows}
                              />
                            </TableCell>
                            {datasetInfo?.column_names.map(col => (
                              <TableCell 
                                key={col}
                                sx={{ 
                                  cursor: 'pointer',
                                  '&:hover': { backgroundColor: 'action.hover' }
                                }}
                                onClick={() => handleSort(col)}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {col}
                                  {sortConfig?.column === col && (
                                    <SortIcon 
                                      sx={{ 
                                        transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                        fontSize: 16 
                                      }} 
                                    />
                                  )}
                                </Box>
                              </TableCell>
                            ))}
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                                                 <TableBody>
                           {getDisplayData().map((row, rowIndex) => (
                             <TableRow 
                               key={rowIndex}
                               hover
                               selected={selectedRows.includes(rowIndex)}
                               sx={{ 
                                 '&:hover': { backgroundColor: 'action.hover' }
                               }}
                             >
                               <TableCell padding="checkbox">
                                 <Checkbox
                                   checked={selectedRows.includes(rowIndex)}
                                   onChange={() => handleRowSelection(rowIndex)}
                                 />
                               </TableCell>
                               {datasetInfo?.column_names.map(col => (
                                 <TableCell 
                                   key={col}
                                   sx={{ 
                                     cursor: 'pointer',
                                     '&:hover': { backgroundColor: 'action.hover' }
                                   }}
                                   onClick={() => startCellEdit(rowIndex, col)}
                                 >
                                   {editingCell?.row === rowIndex && editingCell?.col === col ? (
                                     <TextField
                                       size="small"
                                       value={row[col] || ''}
                                       onChange={(e) => saveCellEdit(rowIndex, col, e.target.value)}
                                       onBlur={cancelCellEdit}
                                       onKeyPress={(e) => e.key === 'Enter' && saveCellEdit(rowIndex, col, (e.target as HTMLInputElement).value)}
                                       autoFocus
                                       fullWidth
                                     />
                                   ) : (
                                     <Typography variant="body2" noWrap>
                                       {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                                     </Typography>
                                   )}
                                 </TableCell>
                               ))}
                               <TableCell>
                                 <IconButton
                                   size="small"
                                   onClick={() => startCellEdit(rowIndex, datasetInfo?.column_names[0] || '')}
                                 >
                                   <EditIcon fontSize="small" />
                                 </IconButton>
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                      </Table>
                    </TableContainer>
                    
                                         {showFullTable && (
                       <TablePagination
                         rowsPerPageOptions={[10, 25, 50, 100]}
                         component="div"
                         count={filteredData.length}
                         rowsPerPage={rowsPerPage}
                         page={page}
                         onPageChange={handleChangePage}
                         onRowsPerPageChange={handleChangeRowsPerPage}
                         labelRowsPerPage="Rows per page:"
                         labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                       />
                     )}
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {previewData.length === 0 
                        ? 'No data available. Please select a dataset and upload some data.'
                        : 'No data matches the current filters. Try adjusting your filter criteria.'
                      }
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Enhanced Filtering Section - Moved to side-by-side layout above */}

      {/* Data Manipulation Tools - Moved to main view above */}

      {/* Data Transformations */}
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
                  disabled={!selectedDataset || loading}
                >
                  Apply Transformations
                </Button>
              </Box>
            </Box>

            {transformations.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No transformations configured. Add a transformation to start manipulating your data.
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
                          <MenuItem value="fill_na">Fill NA Values</MenuItem>
                          <MenuItem value="drop_na">Drop NA Values</MenuItem>
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

      {/* Dialogs */}

      {/* Enhanced Merge Dialog */}
      <Dialog open={showMergeDialog} onClose={() => setShowMergeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransformIcon color="primary" />
            <Typography variant="h6">Smart Dataset Merger</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Dataset Selection */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Left Dataset</InputLabel>
                <Select
                  value={mergeConfig.leftDataset}
                  label="Left Dataset"
                  onChange={(e) => setMergeConfig(prev => ({ ...prev, leftDataset: e.target.value, joinColumns: [], leftColumns: [], rightColumns: [] }))}
                >
                  {datasets.map(d => (
                    <MenuItem key={d.dataset_id} value={d.dataset_id}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{d.filename}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {d.rows} rows × {d.columns} columns
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Right Dataset</InputLabel>
                <Select
                  value={mergeConfig.rightDataset}
                  label="Right Dataset"
                  onChange={(e) => setMergeConfig(prev => ({ ...prev, rightDataset: e.target.value, joinColumns: [], leftColumns: [], rightColumns: [] }))}
                >
                  {datasets.filter(d => d.dataset_id !== mergeConfig.leftDataset).map(d => (
                    <MenuItem key={d.dataset_id} value={d.dataset_id}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{d.filename}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {d.rows} rows × {d.columns} columns
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Merge Type */}
            <FormControl fullWidth>
              <InputLabel>Join Type</InputLabel>
              <Select
                value={mergeConfig.how}
                label="Join Type"
                onChange={(e) => setMergeConfig(prev => ({ ...prev, how: e.target.value as 'inner' | 'left' | 'right' | 'outer' }))}
              >
                <MenuItem value="inner">
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Inner Join</Typography>
                    <Typography variant="caption" color="text.secondary">Only matching records</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="left">
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Left Join</Typography>
                    <Typography variant="caption" color="text.secondary">All left + matching right</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="right">
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Right Join</Typography>
                    <Typography variant="caption" color="text.secondary">All right + matching left</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="outer">
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Outer Join</Typography>
                    <Typography variant="caption" color="text.secondary">All records from both</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Column Selection */}
            {mergeConfig.leftDataset && mergeConfig.rightDataset && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Join Columns
                </Typography>
                
                {/* Common Columns Option */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Option 1: Use common column names
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Common Columns</InputLabel>
                    <Select
                      multiple
                      value={mergeConfig.joinColumns}
                      label="Common Columns"
                      onChange={(e) => setMergeConfig(prev => ({ ...prev, joinColumns: e.target.value as string[], leftColumns: [], rightColumns: [] }))}
                    >
                      {(() => {
                        const leftCols = availableColumns[mergeConfig.leftDataset] || [];
                        const rightCols = availableColumns[mergeConfig.rightDataset] || [];
                        const commonCols = leftCols.filter(col => rightCols.includes(col));
                        return commonCols.map(col => (
                          <MenuItem key={col} value={col}>{col}</MenuItem>
                        ));
                      })()}
                    </Select>
                  </FormControl>
                </Box>

                {/* Different Column Names Option */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Option 2: Specify different column names
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Left Dataset Columns</InputLabel>
                      <Select
                        multiple
                        value={mergeConfig.leftColumns}
                        label="Left Dataset Columns"
                        onChange={(e) => setMergeConfig(prev => ({ ...prev, leftColumns: e.target.value as string[], joinColumns: [] }))}
                      >
                        {(availableColumns[mergeConfig.leftDataset] || []).map(col => (
                          <MenuItem key={col} value={col}>{col}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Right Dataset Columns</InputLabel>
                      <Select
                        multiple
                        value={mergeConfig.rightColumns}
                        label="Right Dataset Columns"
                        onChange={(e) => setMergeConfig(prev => ({ ...prev, rightColumns: e.target.value as string[], joinColumns: [] }))}
                      >
                        {(availableColumns[mergeConfig.rightDataset] || []).map(col => (
                          <MenuItem key={col} value={col}>{col}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMergeDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleMerge}
            disabled={!mergeConfig.leftDataset || !mergeConfig.rightDataset || 
              (mergeConfig.joinColumns.length === 0 && (mergeConfig.leftColumns.length === 0 || mergeConfig.rightColumns.length === 0))}
          >
            Merge Datasets
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Append Dialog */}
      <Dialog open={showConcatDialog} onClose={() => setShowConcatDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon color="primary" />
            <Typography variant="h6">Smart Dataset Appender</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Dataset Selection with Checkboxes */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Select Datasets to Append
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {datasets.map(dataset => (
                    <FormControlLabel
                      key={dataset.dataset_id}
                      control={
                        <Checkbox
                          checked={concatConfig.selectedDatasets.includes(dataset.dataset_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConcatConfig(prev => ({
                                ...prev,
                                selectedDatasets: [...prev.selectedDatasets, dataset.dataset_id]
                              }));
                            } else {
                              setConcatConfig(prev => ({
                                ...prev,
                                selectedDatasets: prev.selectedDatasets.filter(id => id !== dataset.dataset_id)
                              }));
                            }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight="bold">{dataset.filename}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dataset.rows} rows × {dataset.columns} columns
                            </Typography>
                          </Box>
                          <Chip 
                            label={`${dataset.rows}×${dataset.columns}`} 
                            size="small" 
                            variant="outlined" 
                          />
                        </Box>
                      }
                    />
                  ))}
                </Box>
              </Paper>
            </Box>

            {/* Concatenation Options */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Append Options
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Append Direction</InputLabel>
                  <Select
                    value={concatConfig.axis}
                    label="Append Direction"
                    onChange={(e) => setConcatConfig(prev => ({ ...prev, axis: Number(e.target.value) as 0 | 1 }))}
                  >
                    <MenuItem value={0}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">Vertical (Rows)</Typography>
                        <Typography variant="caption" color="text.secondary">Stack datasets on top of each other</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value={1}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">Horizontal (Columns)</Typography>
                        <Typography variant="caption" color="text.secondary">Add columns side by side</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={concatConfig.ignoreIndex} 
                        onChange={(e) => setConcatConfig(prev => ({ ...prev, ignoreIndex: e.target.checked }))} 
                      />
                    }
                    label="Reset row numbers"
                  />
                </Box>
              </Box>
            </Box>

            {/* Preview Info */}
            {concatConfig.selectedDatasets.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Preview
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    {concatConfig.axis === 0 ? (
                      <>
                        <strong>Vertical Append:</strong> Will create a dataset with{' '}
                        <strong>{concatConfig.selectedDatasets.reduce((sum, id) => {
                          const dataset = datasets.find(d => d.dataset_id === id);
                          return sum + (dataset?.rows || 0);
                        }, 0)} rows</strong> and{' '}
                        <strong>{Math.max(...concatConfig.selectedDatasets.map(id => {
                          const dataset = datasets.find(d => d.dataset_id === id);
                          return dataset?.columns || 0;
                        }))} columns</strong>
                      </>
                    ) : (
                      <>
                        <strong>Horizontal Append:</strong> Will create a dataset with{' '}
                        <strong>{Math.max(...concatConfig.selectedDatasets.map(id => {
                          const dataset = datasets.find(d => d.dataset_id === id);
                          return dataset?.rows || 0;
                        }))} rows</strong> and{' '}
                        <strong>{concatConfig.selectedDatasets.reduce((sum, id) => {
                          const dataset = datasets.find(d => d.dataset_id === id);
                          return sum + (dataset?.columns || 0);
                        }, 0)} columns</strong>
                      </>
                    )}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConcatDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAppend}
            disabled={concatConfig.selectedDatasets.length < 2}
          >
            Append {concatConfig.selectedDatasets.length} Dataset{concatConfig.selectedDatasets.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onClose={() => setShowAddColumnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Column</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Column Name"
              value={newColumnConfig.name}
              onChange={(e) => setNewColumnConfig(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Column Type</InputLabel>
              <Select
                value={newColumnConfig.type}
                label="Column Type"
                onChange={(e) => setNewColumnConfig(prev => ({ ...prev, type: e.target.value }))}
              >
                <MenuItem value="numeric">Numeric</MenuItem>
                <MenuItem value="categorical">Categorical</MenuItem>
                <MenuItem value="datetime">Datetime</MenuItem>
                <MenuItem value="object">Object</MenuItem>
              </Select>
            </FormControl>
            {newColumnConfig.type === 'numeric' && (
              <TextField
                label="Formula (optional)"
                value={newColumnConfig.formula}
                onChange={(e) => setNewColumnConfig(prev => ({ ...prev, formula: e.target.value }))}
                fullWidth
                helperText="e.g., 'sum(col1, col2)' or 'avg(col1, col2)'"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddColumnDialog(false)}>Cancel</Button>
          <Button onClick={addNewColumn} variant="contained" disabled={!newColumnConfig.name}>
            Add Column
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Row Dialog */}
      <Dialog open={showAddRowDialog} onClose={() => setShowAddRowDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Row</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {datasetInfo?.column_names.map(col => (
              <TextField
                key={col}
                label={col}
                value={newRowData[col] || ''}
                onChange={(e) => setNewRowData(prev => ({ ...prev, [col]: e.target.value }))}
                fullWidth
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddRowDialog(false)}>Cancel</Button>
          <Button onClick={addNewRow} variant="contained">
            Add Row
          </Button>
        </DialogActions>
      </Dialog>

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

export default DataExplorer; 