import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const ExportPDF = ({
  dashboardRef,
  currentDashboard
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const confirmTimeRange = () => {
    return window.confirm('Have you selected the proper time range for this report?');
  };

  const generatePDF = async () => {
    try {
      // First confirm if the user has selected the proper time range
      if (!confirmTimeRange()) {
        setSnackbar({
          open: true,
          message: 'Please set the appropriate time range before exporting',
          severity: 'warning'
        });
        return;
      }

      setLoading(true);
      
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Define page dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      
      // --------- First Page (Cover Page) ---------
      
      // Add company logo (placeholder - you should replace with your actual logo)
      // This is a placeholder rectangle for where your logo would go
      pdf.setDrawColor(100, 100, 100);
      pdf.setFillColor(240, 240, 240);
      pdf.roundedRect(margin, 40, contentWidth, 40, 3, 3, 'F');
      
      // Add Company Name
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(50, 50, 50);
      pdf.text('Your Company Name', pageWidth / 2, 110, { align: 'center' });
      
      // Add Report Title
      pdf.setFontSize(18);
      pdf.setTextColor(80, 80, 80);
      
      // Format dashboard name for the title
      const dashboardTitle = currentDashboard
        ? currentDashboard.toUpperCase().replace(/_/g, ' ')
        : 'Security Compliance';
        
      pdf.text(`${dashboardTitle} Report`, pageWidth / 2, 130, { align: 'center' });
      
      // Add Date
      const currentDate = new Date().toLocaleDateString();
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${currentDate}`, pageWidth / 2, 150, { align: 'center' });
      
      // Add Copyright information
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('© 2025 Your Company. All Rights Reserved.', pageWidth / 2, 250, { align: 'center' });
      
      // Add footer with timestamp
      const timestamp = new Date().toLocaleString();
      pdf.setFontSize(8);
      pdf.text(`Export timestamp: ${timestamp}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // --------- Second Page (Dashboard Screenshot) ---------
      pdf.addPage();
      
      // Add page title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(50, 50, 50);
      pdf.text(`${dashboardTitle} Dashboard`, margin, margin + 10);
      
      // Add horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, margin + 15, pageWidth - margin, margin + 15);
      
      // Capture the dashboard
      if (dashboardRef && dashboardRef.current) {
        try {
          const canvas = await html2canvas(dashboardRef.current, {
            scale: 1.5, // Higher scale for better quality
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          
          // Calculate image dimensions to fit the page while maintaining aspect ratio
          const imgWidth = contentWidth;
          const imgHeight = canvas.height * imgWidth / canvas.width;
          
          // Check if the image will fit on the current page
          const yPosition = margin + 20;
          const remainingSpace = pageHeight - yPosition - margin;
          
          if (imgHeight > remainingSpace) {
            // Handle large dashboard by splitting across multiple pages
            let srcY = 0;
            let destY = yPosition;
            let remainingHeight = imgHeight;
            
            while (remainingHeight > 0) {
              // Calculate height to render on this page
              const heightOnThisPage = Math.min(remainingHeight, remainingSpace);
              
              // Add portion of the image to the current page
              pdf.addImage(
                imgData, 
                'PNG', 
                margin, // x position
                destY, // y position
                imgWidth, // width
                heightOnThisPage, // height
                '', // alias
                'FAST', // compression
                0, // rotation
                srcY / canvas.height * canvas.height // source Y position (for clipping)
              );
              
              remainingHeight -= heightOnThisPage;
              
              // If we have more to render, add a new page
              if (remainingHeight > 0) {
                pdf.addPage();
                
                // Add continuation header on new page
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(100, 100, 100);
                pdf.text(`${dashboardTitle} Dashboard (continued)`, margin, margin);
                
                srcY += heightOnThisPage * (canvas.height / imgHeight);
                destY = margin + 5;
              }
            }
          } else {
            // Image fits on one page
            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          }
        } catch (error) {
          console.error('Error capturing dashboard:', error);
          
          // Add error message to PDF
          pdf.setTextColor(200, 0, 0);
          pdf.setFontSize(12);
          pdf.text(`Error capturing dashboard: ${error.message}`, margin, margin + 30);
        }
      } else {
        // If dashboard reference is not available
        pdf.setTextColor(200, 0, 0);
        pdf.setFontSize(12);
        pdf.text('Dashboard visualization not available', margin, margin + 30);
      }
      
      // Add footer with page numbers to all pages
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        
        // Add timestamp to footer on all pages
        pdf.text(`Export timestamp: ${timestamp}`, margin, pageHeight - 5);
      }
      
      // Save PDF
      const dashboardName = currentDashboard || 'dashboard';
      const filename = `${dashboardName}_report_${new Date().toISOString().split('T')[0]}.pdf`;
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
        maxWidth="sm"
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
          <Typography variant="body1" paragraph>
            This will export the current dashboard as a PDF report with:
          </Typography>
          
          <Typography component="div">
            <ul>
              <li>Company logo and information on the cover page</li>
              <li>Full screenshot of the current dashboard</li>
              <li>Timestamp and page numbers on each page</li>
            </ul>
          </Typography>
          
          <Typography variant="subtitle2" color="error" sx={{ mt: 2 }}>
            Important: Please ensure you have selected the appropriate time range for your report before proceeding.
          </Typography>
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
            disabled={loading}
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