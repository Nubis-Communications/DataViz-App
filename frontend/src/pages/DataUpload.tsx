import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface DatasetInfo {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  data_types: Record<string, string>;
  summary_stats: Record<string, any>;
  upload_time: string;
}

interface UploadedFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  datasetInfo?: DatasetInfo;
}

const DataUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [separator, setSeparator] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      status: 'uploading',
      progress: 0,
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    handleFileUpload(newFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const handleFileUpload = async (files: UploadedFile[]) => {
    setIsUploading(true);
    
    for (const fileInfo of files) {
      try {
        const formData = new FormData();
        formData.append('file', fileInfo.file);
        if (separator) {
          formData.append('separator', separator);
        }

        const response = await axios.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              updateFileProgress(fileInfo.file.name, progress);
            }
          },
        });

        // Update file status to success
        updateFileStatus(fileInfo.file.name, 'success', undefined, response.data);
        
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
        updateFileStatus(fileInfo.file.name, 'error', errorMessage);
      }
    }
    
    setIsUploading(false);
  };

  const updateFileProgress = (filename: string, progress: number) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.file.name === filename 
          ? { ...file, progress } 
          : file
      )
    );
  };

  const updateFileStatus = (filename: string, status: 'success' | 'error', error?: string, datasetInfo?: DatasetInfo) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.file.name === filename 
          ? { ...file, status, error, datasetInfo, progress: status === 'success' ? 100 : 0 } 
          : file
      )
    );
  };

  const removeFile = (filename: string) => {
    setUploadedFiles(prev => prev.filter(file => file.file.name !== filename));
  };

  const getFileIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'uploading':
        return <CircularProgress size={20} />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Upload & Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Data Files
              </Typography>
              
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: isDragActive ? 'primary.50' : 'grey.50',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.50',
                  },
                }}
              >
                <input {...getInputProps()} />
                <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" color="primary" gutterBottom>
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select files
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Supports: CSV, Excel (.xlsx, .xls), Text (.txt)
                </Typography>
              </Box>

              {/* Separator Configuration */}
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Separator (for CSV/TXT)</InputLabel>
                  <Select
                    value={separator}
                    label="Separator (for CSV/TXT)"
                    onChange={(e) => setSeparator(e.target.value)}
                  >
                    <MenuItem value="">Auto-detect</MenuItem>
                    <MenuItem value=",">Comma (,)</MenuItem>
                    <MenuItem value=";">Semicolon (;)</MenuItem>
                    <MenuItem value="\t">Tab</MenuItem>
                    <MenuItem value="|">Pipe (|)</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Leave as "Auto-detect" for automatic separator detection
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upload Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Progress
              </Typography>
              
              {uploadedFiles.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No files uploaded yet
                </Typography>
              ) : (
                <Box>
                  {uploadedFiles.map((fileInfo, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getFileIcon(fileInfo.status)}
                        <Typography variant="body2" sx={{ ml: 1, flexGrow: 1 }}>
                          {fileInfo.file.name}
                        </Typography>
                        <Chip 
                          label={formatFileSize(fileInfo.file.size)} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeFile(fileInfo.file.name)}
                          sx={{ ml: 1 }}
                        >
                          Remove
                        </Button>
                      </Box>
                      
                      {fileInfo.status === 'uploading' && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress variant="determinate" value={fileInfo.progress} />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {fileInfo.progress}%
                          </Typography>
                        </Box>
                      )}
                      
                      {fileInfo.status === 'error' && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {fileInfo.error}
                        </Alert>
                      )}
                      
                      {fileInfo.status === 'success' && fileInfo.datasetInfo && (
                        <Alert severity="success" sx={{ mt: 1 }}>
                          Successfully uploaded: {fileInfo.datasetInfo.rows} rows, {fileInfo.datasetInfo.columns} columns
                        </Alert>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Dataset Information */}
        {uploadedFiles.some(f => f.status === 'success' && f.datasetInfo) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dataset Information
                </Typography>
                
                {uploadedFiles
                  .filter(f => f.status === 'success' && f.datasetInfo)
                  .map((fileInfo, index) => (
                    <Accordion key={index} sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                          {fileInfo.datasetInfo!.filename} - {fileInfo.datasetInfo!.rows} rows × {fileInfo.datasetInfo!.columns} columns
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Column Information
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Column</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Missing</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {fileInfo.datasetInfo!.column_names.map((col) => (
                                    <TableRow key={col}>
                                      <TableCell>{col}</TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={fileInfo.datasetInfo!.data_types[col]} 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {fileInfo.datasetInfo!.summary_stats[col]?.missing_count || 0}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" gutterBottom>
                              Summary Statistics
                            </Typography>
                            <Box>
                              {Object.entries(fileInfo.datasetInfo!.summary_stats).map(([col, stats]) => (
                                <Box key={col} sx={{ mb: 2 }}>
                                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                                    {col}
                                  </Typography>
                                  {stats.type === 'numeric' && (
                                    <Box sx={{ pl: 2 }}>
                                      <Typography variant="caption" display="block">
                                        Min: {stats.min}, Max: {stats.max}
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        Mean: {stats.mean?.toFixed(2)}, Std: {stats.std?.toFixed(2)}
                                      </Typography>
                                    </Box>
                                  )}
                                  {stats.type === 'categorical' && (
                                    <Box sx={{ pl: 2 }}>
                                      <Typography variant="caption" display="block">
                                        Unique values: {stats.unique_values}
                                      </Typography>
                                      <Typography variant="caption" display="block">
                                        Cardinality: {stats.cardinality}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// LinearProgress component (Material-UI v5)
const LinearProgress: React.FC<{ variant: 'determinate'; value: number }> = ({ value }) => (
  <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
    <Box
      sx={{
        width: `${value}%`,
        height: 8,
        bgcolor: 'primary.main',
        transition: 'width 0.3s ease',
      }}
    />
  </Box>
);

export default DataUpload; 