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
  dashboardRef,
  currentDashboard,
  allDashboardRefs
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

    switch (timeInterval) {
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
  
      // Fetch the latest data if no time range is specified
      if (!timeRange && fetchData) {
        await fetchData();
      }
  
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yOffset = 10;
      
      // Add logo/branding (optional)
      // pdf.addImage(logoData, 'PNG', 10, 10, 50, 15);
      
      // Add title with styling
      pdf.setFillColor(0, 123, 255);
      pdf.rect(0, 0, 210, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Security Compliance Report', 105, 20, { align: 'center' });
      yOffset = 40;
      
      // Add date and time range with styled section
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const currentDate = new Date().toLocaleString();
      pdf.text(`Generated on: ${currentDate}`, 20, yOffset);
      yOffset += 8;
      
      // Add time range info with styling
      if (timeRange) {
        pdf.text(`Time Range: ${new Date(timeRange.start).toLocaleString()} to ${new Date(timeRange.end).toLocaleString()}`, 20, yOffset);
      } else {
        pdf.text('Time Range: Current View', 20, yOffset);
      }
      yOffset += 15;
      
      // Add executive summary section
      pdf.setFillColor(240, 240, 240);
      pdf.rect(10, yOffset, 190, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(50, 50, 50);
      pdf.setFontSize(14);
      pdf.text('Executive Summary', 15, yOffset + 6);
      yOffset += 15;
      
      // Add summary text
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      
      // Calculate total events across all dashboards
      const totalEvents = Object.values(dashboardData)
        .filter(data => Array.isArray(data))
        .reduce((sum, data) => sum + data.length, 0);
      
      const summaryText = `This report summarizes security compliance events across ${Object.keys(dashboardData).length} selected frameworks. A total of ${totalEvents} events were analyzed during the selected time period.`;
      
      const splitSummary = pdf.splitTextToSize(summaryText, 180);
      pdf.text(splitSummary, 15, yOffset);
      yOffset += splitSummary.length * 6 + 15;
      
      // If we have dashboard refs, capture each selected one with proper sectioning
      for (const [dashboard, selected] of Object.entries(selectedDashboards)) {
        if (selected) {
          let currentRef = null;
          
          // For current dashboard
          if (dashboard === currentDashboard && dashboardRef && dashboardRef.current) {
            currentRef = dashboardRef.current;
          } 
          // For other dashboards
          else if (allDashboardRefs && allDashboardRefs[dashboard] && allDashboardRefs[dashboard].current) {
            currentRef = allDashboardRefs[dashboard].current;
          }
          
          // Format dashboard name
          const dashboardName = dashboard.toUpperCase().replace(/([A-Z])/g, ' $1').trim();
          
          // Add dashboard section header with styling
          if (yOffset > 250) { // Add page break if near bottom of page
            pdf.addPage();
            yOffset = 20;
          }
          
          // Add colored header for each dashboard
          pdf.setFillColor(0, 123, 255);
          pdf.setTextColor(255, 255, 255);
          pdf.rect(10, yOffset, 190, 10, 'F');
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${dashboardName} Dashboard`, 15, yOffset + 7);
          yOffset += 15;
          
          // Add dashboard visualization
          if (currentRef) {
            try {
              // Get all visualization blocks within the dashboard
              const visualizationBlocks = currentRef.querySelectorAll('.visualization-block, .chart-container, .dashboard-item');
              
              if (visualizationBlocks.length > 0) {
                // Process each visualization block
                for (const block of visualizationBlocks) {
                  // Add a small title for each block if it has one
                  if (block.querySelector('.block-title, .chart-title, h3, h4')) {
                    const blockTitle = block.querySelector('.block-title, .chart-title, h3, h4').textContent;
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(80, 80, 80);
                    pdf.setFontSize(10);
                    pdf.text(blockTitle, 15, yOffset);
                    yOffset += 6;
                  }
                  
                  const canvas = await html2canvas(block, {
                    scale: 1.5,
                    useCORS: true,
                    logging: false
                  });
                  
                  const imgData = canvas.toDataURL('image/png');
                  const imgWidth = 180;
                  const imgHeight = canvas.height * imgWidth / canvas.width;
                  
                  // Add border around the visualization
                  pdf.setDrawColor(200, 200, 200);
                  pdf.line(15, yOffset, 195, yOffset);
                  yOffset += 20; // Increased spacing between sections
                  
                  pdf.addImage(imgData, 'PNG', 15, yOffset, imgWidth, imgHeight);
                  yOffset += imgHeight + 15;
                  
                  // Check if we need a new page for the next item
                  if (yOffset > 270) {
                    pdf.addPage();
                    yOffset = 20;
                  }
                }
              } else {
                // Fallback to capturing the entire dashboard if no blocks found
                const canvas = await html2canvas(currentRef, {
                  scale: 1.5,
                  useCORS: true,
                  logging: false
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 180;
                const imgHeight = canvas.height * imgWidth / canvas.width;
                
                pdf.setDrawColor(200, 200, 200);
                pdf.rect(15, yOffset, imgWidth, imgHeight, 'S');
                
                pdf.addImage(imgData, 'PNG', 15, yOffset, imgWidth, imgHeight);
                yOffset += imgHeight + 10;
              }
            } catch (error) {
              console.error(`Error capturing ${dashboard} dashboard:`, error);
              pdf.setTextColor(200, 0, 0);
              pdf.setFontSize(10);
              pdf.text(`Error capturing visualization: ${error.message}`, 15, yOffset);
              yOffset += 10;
            }
          }
          
          // Add dashboard data summaries with improved formatting
          const data = dashboardData[dashboard];
          if (data) {
            // Add a summary subsection with light gray background
            pdf.setFillColor(245, 245, 245);
            pdf.rect(15, yOffset, 180, 8, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(80, 80, 80);
            pdf.setFontSize(12);
            pdf.text(`${dashboardName} Summary Statistics`, 20, yOffset + 6);
            yOffset += 12;
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            
            // Add specific details based on dashboard type with better formatting
            switch(dashboard) {
              case 'nist':
                // Calculate NIST-specific metrics
                const nistControls = data.flatMap(log => log.parsed?.rule?.nist_800_53 || []);
                const nistControlCount = new Set(nistControls).size;
                const controlDistribution = {};
                
                nistControls.forEach(control => {
                  controlDistribution[control] = (controlDistribution[control] || 0) + 1;
                });
                
                // Sort controls by frequency
                const topControls = Object.entries(controlDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);
                
                // Add severity distribution
                const criticalCount = data.filter(log => parseInt(log.parsed?.rule?.level) >= 12).length;
                const highCount = data.filter(log => {
                  const level = parseInt(log.parsed?.rule?.level);
                  return level >= 8 && level < 12;
                }).length;
                const mediumCount = data.filter(log => {
                  const level = parseInt(log.parsed?.rule?.level);
                  return level >= 4 && level < 8;
                }).length;
                const lowCount = data.filter(log => {
                  const level = parseInt(log.parsed?.rule?.level);
                  return level < 4;
                }).length;
                
                // Display metrics with better formatting
                pdf.setTextColor(80, 80, 80);
                pdf.text(`• Total NIST Events: ${data.length}`, 25, yOffset);
                yOffset += 6;
                pdf.text(`• Unique NIST Controls: ${nistControlCount}`, 25, yOffset);
                yOffset += 6;
                
                // Add severity distribution with color coding
                pdf.setTextColor(200, 0, 0); // Red for critical
                pdf.text(`• Critical Severity (12+): ${criticalCount} (${((criticalCount/data.length)*100).toFixed(1)}%)`, 25, yOffset);
                yOffset += 6;
                
                pdf.setTextColor(255, 120, 0); // Orange for high
                pdf.text(`• High Severity (8-11): ${highCount} (${((highCount/data.length)*100).toFixed(1)}%)`, 25, yOffset);
                yOffset += 6;
                
                pdf.setTextColor(120, 120, 0); // Yellow-ish for medium
                pdf.text(`• Medium Severity (4-7): ${mediumCount} (${((mediumCount/data.length)*100).toFixed(1)}%)`, 25, yOffset);
                yOffset += 6;
                
                pdf.setTextColor(0, 180, 0); // Green for low
                pdf.text(`• Low Severity (0-3): ${lowCount} (${((lowCount/data.length)*100).toFixed(1)}%)`, 25, yOffset);
                yOffset += 12;
                
                // Add top controls section
                pdf.setTextColor(80, 80, 80);
                pdf.setFont('helvetica', 'bold');
                pdf.text("Top NIST Controls:", 25, yOffset);
                yOffset += 6;
                
                pdf.setFont('helvetica', 'normal');
                for (const [control, count] of topControls) {
                  pdf.text(`   - ${control}: ${count} occurrences`, 25, yOffset);
                  yOffset += 5;
                }
                
                yOffset += 10;
                break;
                
              case 'hipaa':
                // Calculate HIPAA-specific metrics with visualization
                const hipaaControls = data.flatMap(log => log.parsed?.rule?.hipaa || []);
                const hipaaControlCount = new Set(hipaaControls).size;
                const hipaaDistribution = {};
                
                hipaaControls.forEach(control => {
                  hipaaDistribution[control] = (hipaaDistribution[control] || 0) + 1;
                });
                
                // Get top HIPAA controls
                const topHipaaControls = Object.entries(hipaaDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);
                
                pdf.setTextColor(80, 80, 80);
                pdf.text(`• Total HIPAA Events: ${data.length}`, 25, yOffset);
                yOffset += 6;
                pdf.text(`• Unique HIPAA Controls: ${hipaaControlCount}`, 25, yOffset);
                yOffset += 10;
                
                // Add top controls section
                pdf.setFont('helvetica', 'bold');
                pdf.text("Top HIPAA Controls:", 25, yOffset);
                yOffset += 6;
                
                pdf.setFont('helvetica', 'normal');
                for (const [control, count] of topHipaaControls) {
                  pdf.text(`   - ${control}: ${count} occurrences`, 25, yOffset);
                  yOffset += 5;
                }
                
                yOffset += 10;
                break;
                
              // Similar approach for other frameworks
              case 'tsc':
              case 'pcidss':
              case 'gdpr':
                const controls = data.flatMap(log => log.parsed?.rule?.[dashboard] || []);
                const controlCount = new Set(controls).size;
                
                pdf.setTextColor(80, 80, 80);
                pdf.text(`• Total ${dashboardName} Events: ${data.length}`, 25, yOffset);
                yOffset += 6;
                pdf.text(`• Unique ${dashboardName} Controls: ${controlCount}`, 25, yOffset);
                yOffset += 10;
                break;
                
              case 'major':
                // For major logs, add more detailed breakdown
                const agentDistribution = {};
                data.forEach(log => {
                  const agent = log.agent_name || 'Unknown';
                  agentDistribution[agent] = (agentDistribution[agent] || 0) + 1;
                });
                
                const topAgents = Object.entries(agentDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);
                
                pdf.setTextColor(80, 80, 80);
                pdf.text(`• Total Major Events: ${data.length}`, 25, yOffset);
                yOffset += 10;
                
                // Add top agents section
                pdf.setFont('helvetica', 'bold');
                pdf.text("Top Event Sources:", 25, yOffset);
                yOffset += 6;
                
                pdf.setFont('helvetica', 'normal');
                for (const [agent, count] of topAgents) {
                  pdf.text(`   - ${agent}: ${count} events`, 25, yOffset);
                  yOffset += 5;
                }
                
                yOffset += 10;
                break;
                
              default:
                break;
            }
          }
          
          // Add a divider
          pdf.setDrawColor(200, 200, 200);
          pdf.line(15, yOffset, 195, yOffset);
          yOffset += 15;
          
          if (yOffset > 270) {
            pdf.addPage();
            yOffset = 20;
          }
        }
      }
      
      // Add recommendations section at the end
      if (yOffset > 240) {
        pdf.addPage();
        yOffset = 20;
      }
      
      pdf.setFillColor(0, 123, 255);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(10, yOffset, 190, 10, 'F');
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text("Recommendations", 15, yOffset + 7);
      yOffset += 15;
      
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const recommendationsText = "Based on the analysis of security events, we recommend focusing on addressing critical and high severity findings first. Regular review of compliance controls and timely remediation of identified issues will help maintain a strong security posture.";
      
      const splitRecommendations = pdf.splitTextToSize(recommendationsText, 180);
      pdf.text(splitRecommendations, 15, yOffset);
      
      // Add footer with page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      }
      
      // Save PDF
      const filename = `CS_Report_${new Date().toISOString().split('T')[0]}.pdf`;
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