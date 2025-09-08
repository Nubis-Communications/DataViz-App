import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
  useTheme,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Explore as ExploreIcon,
  BarChart as ChartIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Dataset {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  upload_time: string;
}

interface PlatformStats {
  total_datasets: number;
  total_rows: number;
  total_columns: number;
  total_size_mb: number;
}

const Dashboard: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/datasets');
      const datasetsData = response.data.datasets;
      setDatasets(datasetsData);
      
      // Calculate platform statistics
      const platformStats: PlatformStats = {
        total_datasets: datasetsData.length,
        total_rows: datasetsData.reduce((sum: number, ds: Dataset) => sum + ds.rows, 0),
        total_columns: datasetsData.reduce((sum: number, ds: Dataset) => sum + ds.columns, 0),
        total_size_mb: Math.round(datasetsData.reduce((sum: number, ds: Dataset) => sum + (ds.rows * ds.columns * 0.0001), 0) * 100) / 100,
      };
      setStats(platformStats);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    try {
      await axios.delete(`/dataset/${datasetId}`);
      setDatasets(prev => prev.filter(ds => ds.dataset_id !== datasetId));
      fetchDatasets(); // Refresh stats
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete dataset');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getQuickActionCards = () => [
    {
      title: 'Upload Data',
      description: 'Import CSV, Excel, or text files',
      icon: <UploadIcon />,
      action: () => navigate('/upload'),
      gradient: 'linear-gradient(135deg, #1f4e79 0%, #4a7ba7 100%)',
      stats: `${datasets.length} datasets`,
    },
    {
      title: 'Explore Data',
      description: 'Filter, transform, and analyze datasets',
      icon: <ExploreIcon />,
      action: () => navigate('/explorer'),
      gradient: 'linear-gradient(135deg, #00a86b 0%, #4dd4a3 100%)',
      stats: `${stats?.total_rows || 0} rows`,
    },
    {
      title: 'Create Visualizations',
      description: 'Build interactive charts and plots',
      icon: <ChartIcon />,
      action: () => navigate('/visualization'),
      gradient: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
      stats: 'Interactive charts',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, #1f4e79 0%, #00a86b 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1,
        }}>
          Welcome to DataViz Platform
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400 }}>
          Transform your data into actionable insights with professional visualization tools
        </Typography>
      </Box>

      {/* Stats Overview */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #1f4e79 0%, #4a7ba7 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translate(30px, -30px)',
              },
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.total_datasets}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Datasets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #00a86b 0%, #4dd4a3 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translate(30px, -30px)',
              },
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.total_rows.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Rows
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translate(30px, -30px)',
              },
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.total_columns}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Columns
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translate(30px, -30px)',
              },
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats.total_size_mb} MB
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Data Size
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Quick Actions */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
        Quick Actions
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Platform Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" gutterBottom>
                  {stats.total_datasets}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Datasets
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary" gutterBottom>
                  {stats.total_rows.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Rows
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success" gutterBottom>
                  {stats.total_columns}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Columns
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info" gutterBottom>
                  {stats.total_size_mb} MB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estimated Size
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {getQuickActionCards().map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
                  '& .card-icon': {
                    transform: 'scale(1.1)',
                  },
                },
              }}
              onClick={card.action}
            >
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 2,
                }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 3,
                      background: card.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'transform 0.3s ease',
                    }}
                    className="card-icon"
                  >
                    {card.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      {card.description}
                    </Typography>
                    <Chip 
                      label={card.stats} 
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(31, 78, 121, 0.1)',
                        color: 'primary.main',
                        fontWeight: 500,
                      }} 
                    />
                  </Box>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '50%',
                  transform: 'translate(30px, -30px)',
                }}
              />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Datasets */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
        Recent Datasets
      </Typography>
      
      {datasets.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <UploadIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No datasets uploaded yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start by uploading your first data file to begin analysis
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<UploadIcon />}
              onClick={() => navigate('/upload')}
            >
              Upload First Dataset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Filename</TableCell>
                    <TableCell align="right">Rows</TableCell>
                    <TableCell align="right">Columns</TableCell>
                    <TableCell>Upload Time</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datasets.slice(0, 10).map((dataset) => (
                    <TableRow key={dataset.dataset_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {dataset.filename}
                        </Typography>
                        <Chip 
                          label={dataset.dataset_id} 
                          size="small" 
                          variant="outlined" 
                          sx={{ mt: 0.5 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {dataset.rows.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {dataset.columns}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(dataset.upload_time)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate('/explorer')}
                          title="View Dataset"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDataset(dataset.dataset_id)}
                          title="Delete Dataset"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {datasets.length > 10 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing 10 of {datasets.length} datasets
                </Typography>
                <Button
                  variant="text"
                  onClick={() => navigate('/explorer')}
                  sx={{ mt: 1 }}
                >
                  View All Datasets
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Features */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Platform Features
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                🚀 Smart Data Parsing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Automatic format detection, separator inference, and data type recognition for CSV, Excel, and text files.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                🔍 Advanced Data Exploration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Interactive filtering, data transformation, and comprehensive statistical analysis with missing data insights.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                📊 Professional Visualizations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create static and interactive plots with professional styling, customizable themes, and export capabilities.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                🌐 Network Deployment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deploy on your local network for team collaboration with up to 20 concurrent users and 20MB file support.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard; 