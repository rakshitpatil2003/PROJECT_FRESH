import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { API_URL } from '../config';

const ExportPDF = ({ 
  fetchData, 
  currentData,
  dashboardRef 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeInterval, setTimeInterval] = useState('current');
  const [customInterval, setCustomInterval] = useState({
    start: '',
    end: ''
  });
  const [selectedDashboards, setSelectedDashboards] = useState({
    nist: false,
    major: false,
    hipaa: false,
    tsc: false,
    pcidss: false,
    gdpr: false
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleTimeIntervalChange = (event) => {
    setTimeInterval(event.target.value);
  };

  const handleCustomIntervalChange = (field) => (event) => {
    setCustomInterval({
      ...customInterval,
      [field]: event.target.value
    });
  };

  const handleDashboardSelection = (name) => (event) => {
    setSelectedDashboards({
      ...selectedDashboards,
      [name]: event.target.checked
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const calculateTimeRange = () => {
    const now = new Date();
    
    switch(timeInterval) {
      case 'last24h':
        const yesterday = new Date(now);
        yesterday.setHours(now.getHours() - 24);
        return { start: yesterday.toISOString(), end: now.toISOString() };
      
      case 'last7d':
        const lastWeek = new Date(now);
        lastWeek.setDate(now.getDate() - 7);
        return { start: lastWeek.toISOString(), end: now.toISOString() };
      
      case 'last30d':
        const lastMonth = new Date(now);
        lastMonth.setDate(now.getDate() - 30);
        return { start: lastMonth.toISOString(), end: now.toISOString() };
      
      case 'custom':
        return { 
          start: new Date(customInterval.start).toISOString(),
          end: new Date(customInterval.end).toISOString()
        };
      
      case 'current':
      default:
        return null;
    }
  };

  const fetchDashboardData = async (dashboardType, timeRange) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      let endpoint = `${API_URL}/api/logs/session`;
      if (timeRange) {
        endpoint += `?start=${encodeURIComponent(timeRange.start)}&end=${encodeURIComponent(timeRange.end)}`;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${dashboardType} data`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${dashboardType} data:`, error);
      throw error;
    }
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      
      const timeRange = calculateTimeRange();
      let dashboardData = {};
      
      // Fetch data for selected dashboards
      for (const [dashboard, selected] of Object.entries(selectedDashboards)) {
        if (selected) {
          try {
            if (timeRange) {
              // Fetch new data with specific time range
              dashboardData[dashboard] = await fetchDashboardData(dashboard, timeRange);
            } else {
              // Use current data
              dashboardData[dashboard] = currentData;
            }
          } catch (error) {
            console.error(`Error fetching ${dashboard} data:`, error);
            setSnackbar({
              open: true,
              message: `Error fetching ${dashboard} data: ${error.message}`,
              severity: 'error'
            });
          }
        }
      }

      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yOffset = 10;
      
      // Add title
      pdf.setFontSize(18);
      pdf.text('Security Compliance Report', 105, yOffset, { align: 'center' });
      yOffset += 10;
      
      // Add date
      pdf.setFontSize(12);
      const currentDate = new Date().toLocaleString();
      pdf.text(`Generated on: ${currentDate}`, 105, yOffset, { align: 'center' });
      yOffset += 10;
      
      // Add time range info if specified
      if (timeRange) {
        pdf.text(`Time Range: ${new Date(timeRange.start).toLocaleString()} to ${new Date(timeRange.end).toLocaleString()}`, 105, yOffset, { align: 'center' });
        yOffset += 15;
      } else {
        pdf.text('Time Range: Current View', 105, yOffset, { align: 'center' });
        yOffset += 15;
      }

      // If we have a dashboard ref, capture it
      if (dashboardRef && dashboardRef.current) {
        const canvas = await html2canvas(dashboardRef.current, {
          scale: 1,
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 10;
      }
      
      // Add dashboard data summaries
      for (const [dashboard, data] of Object.entries(dashboardData)) {
        if (data) {
          // Format dashboard name
          const dashboardName = dashboard.toUpperCase().replace(/([A-Z])/g, ' $1').trim();
          
          pdf.setFontSize(14);
          pdf.text(`${dashboardName} Dashboard Summary`, 10, yOffset);
          yOffset += 8;
          
          pdf.setFontSize(10);
          
          // Add specific details based on dashboard type
          switch(dashboard) {
            case 'nist':
              const nistControlCount = new Set(data.flatMap(log => 
                log.parsed?.rule?.nist_800_53 || []
              )).size;
              
              pdf.text(`• Total NIST Events: ${data.length}`, 15, yOffset);
              yOffset += 5;
              pdf.text(`• Unique NIST Controls: ${nistControlCount}`, 15, yOffset);
              yOffset += 5;
              
              // Add severity distribution
              const criticalCount = data.filter(log => parseInt(log.parsed?.rule?.level) >= 12).length;
              const highCount = data.filter(log => {
                const level = parseInt(log.parsed?.rule?.level);
                return level >= 8 && level < 12;
              }).length;
              
              pdf.text(`• Critical Severity (12+): ${criticalCount}`, 15, yOffset);
              yOffset += 5;
              pdf.text(`• High Severity (8-11): ${highCount}`, 15, yOffset);
              yOffset += 10;
              break;
              
            case 'hipaa':
              const hipaaControlCount = new Set(data.flatMap(log => 
                log.parsed?.rule?.hipaa || []
              )).size;
              
              pdf.text(`• Total HIPAA Events: ${data.length}`, 15, yOffset);
              yOffset += 5;
              pdf.text(`• Unique HIPAA Controls: ${hipaaControlCount}`, 15, yOffset);
              yOffset += 5;         
              break;
            case 'tsc':
              const tscControlCount = new Set(data.flatMap(log => 
                log.parsed?.rule?.tsc || []
              )).size;
              
              pdf.text(`• Total TSC Events: ${data.length}`, 15, yOffset);
              yOffset += 5;
              pdf.text(`• Unique TSC Controls: ${tscControlCount}`, 15, yOffset);
              yOffset += 5;         
              break;
            case 'pcidss':
              const pcidssControlCount = new Set(data.flatMap(log => 
                log.parsed?.rule?.pci_dss || []
              )).size;
              
              pdf.text(`• Total PCIDSS Events: ${data.length}`, 15, yOffset);
              yOffset += 5;
              pdf.text(`• Unique PCIDSS Controls: ${pcidssControlCount}`, 15, yOffset);
              yOffset += 5;         
              break;
            case 'gdpr':
              const gdprControlCount = new Set(data.flatMap(log => 
                log.parsed?.rule?.gdpr || []
              )).size;
              
              pdf.text(`• Total GDPR Events: ${data.length}`, 15, yOffset);
              yOffset += 5;
              pdf.text(`• Unique GDPR Controls: ${gdprControlCount}`, 15, yOffset);
              yOffset += 5;         
              break;
            case 'major':
              pdf.text(`• Total Events: ${data.length}`, 15, yOffset);
              yOffset += 5;
              // Add more dashboard-specific summaries here
              break;
              
            default:
              break;
          }
        }
      }
      
      // Save PDF
      const filename = `security_compliance_report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      setSnackbar({
        open: true,
        message: 'PDF exported successfully!',
        severity: 'success'
      });
      
      handleClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setSnackbar({
        open: true,
        message: `Error generating PDF: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<PictureAsPdfIcon />}
        onClick={handleOpen}
        sx={{ ml: 2 }}
      >
        Export PDF
      </Button>
      
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Export Dashboard to PDF</Typography>
            <IconButton aria-label="close" onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="subtitle1" gutterBottom>
            Time Range
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <TextField
              select
              label="Select Time Interval"
              value={timeInterval}
              onChange={handleTimeIntervalChange}
              variant="outlined"
              size="small"
            >
              <MenuItem value="current">Current View</MenuItem>
              <MenuItem value="last24h">Last 24 Hours</MenuItem>
              <MenuItem value="last7d">Last 7 Days</MenuItem>
              <MenuItem value="last30d">Last 30 Days</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </TextField>
          </FormControl>
          
          {timeInterval === 'custom' && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Start Date"
                type="datetime-local"
                value={customInterval.start}
                onChange={handleCustomIntervalChange('start')}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
              <TextField
                label="End Date"
                type="datetime-local"
                value={customInterval.end}
                onChange={handleCustomIntervalChange('end')}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Box>
          )}
          
          <Typography variant="subtitle1" gutterBottom>
            Content Selection
          </Typography>
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormGroup>
              <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={1}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedDashboards.nist} 
                      onChange={handleDashboardSelection('nist')} 
                      name="nist" 
                    />
                  }
                  label="NIST 800-53"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedDashboards.major} 
                      onChange={handleDashboardSelection('major')} 
                      name="major" 
                    />
                  }
                  label="Major Logs"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedDashboards.hipaa} 
                      onChange={handleDashboardSelection('hipaa')} 
                      name="hipaa" 
                    />
                  }
                  label="HIPAA"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedDashboards.tsc} 
                      onChange={handleDashboardSelection('tsc')} 
                      name="tsc" 
                    />
                  }
                  label="TSC"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedDashboards.pcidss} 
                      onChange={handleDashboardSelection('pcidss')} 
                      name="pcidss" 
                    />
                  }
                  label="PCI DSS"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedDashboards.gdpr} 
                      onChange={handleDashboardSelection('gdpr')} 
                      name="gdpr" 
                    />
                  }
                  label="GDPR"
                />
              </Box>
            </FormGroup>
          </FormControl>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={generatePDF} 
            color="primary" 
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
            disabled={loading || !Object.values(selectedDashboards).some(selected => selected)}
          >
            {loading ? 'Generating...' : 'Generate PDF'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExportPDF;