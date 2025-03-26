import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Box, 
  Card, 
  CardContent, 
  Grid,
  Paper
} from '@mui/material';
import { 
  Security as SecurityIcon, 
  NetworkCheck as NetworkCheckIcon, 
  Shield as ShieldIcon 
} from '@mui/icons-material';
import axios from 'axios';

const SOARPlaybook = () => {
    const [dialogMessage, setDialogMessage] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
  
    const handleOpenSOAR = () => {
      try {
        // Attempt direct login URL
        const shuffleLoginUrl = 'https://192.168.1.70:3443/login';
        
        // Open in new tab
        const newWindow = window.open(shuffleLoginUrl, '_blank');
        
        // Fallback if window.open is blocked
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = 'https://192.168.1.70:3443/login';
          form.target = '_blank';
          
          const usernameInput = document.createElement('input');
          usernameInput.type = 'hidden';
          usernameInput.name = 'username';
          usernameInput.value = 'admin';
          form.appendChild(usernameInput);
  
          const passwordInput = document.createElement('input');
          passwordInput.type = 'hidden';
          passwordInput.name = 'password';
          passwordInput.value = 'admin';
          form.appendChild(passwordInput);
  
          document.body.appendChild(form);
          form.submit();
        }
      } catch (error) {
        console.error('Error opening Shuffle page:', error);
        setDialogMessage('Unable to open SOAR platform');
        setOpenDialog(true);
      }
    };
  
    useEffect(() => {
      const checkSOARAccess = async () => {
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/soar/access`);
          
          if (response.data.user_access) {
            handleOpenSOAR();
          } else {
            setDialogMessage('You are not accessible to the SOAR playbook. Please upgrade with the PLATINUM plan to access SOAR and add more security to your organization.');
            setOpenDialog(true);
          }
        } catch (error) {
          setDialogMessage('System configuration error');
          setOpenDialog(true);
        }
      };
    
      checkSOARAccess();
    }, []);

  return (
    <Box sx={{ 
      p: 4, 
      mt: 6,  // Shifted 3 lines down
      backgroundColor: '#f4f6f8' 
    }}>
      <Typography 
        variant="h3" 
        gutterBottom 
        sx={{ 
          mb: 4, 
          fontWeight: 'bold', 
          color: '#1a237e',
          textAlign: 'center'
        }}
      >
        SOAR Playbook
      </Typography>

      {/* SOAR Benefits Section */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <SecurityIcon sx={{ fontSize: 60, color: '#1a237e', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Proactive Threat Detection
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Continuously monitor and identify potential security threats before they escalate, providing real-time protection for your organization.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <NetworkCheckIcon sx={{ fontSize: 60, color: '#1a237e', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Automated Incident Response
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Rapidly respond to security incidents with automated workflows, reducing response time and minimizing potential damage.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <ShieldIcon sx={{ fontSize: 60, color: '#1a237e', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Comprehensive Security Orchestration
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Integrate and coordinate security tools and processes to create a unified, intelligent defense strategy.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed SOAR Benefits */}
      <Paper elevation={2} sx={{ p: 4, backgroundColor: '#ffffff' }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1a237e', mb: 3 }}>
          Why SOAR is Critical for Modern Cybersecurity
        </Typography>
        <Typography variant="body1" paragraph>
          In today's rapidly evolving digital landscape, Security Orchestration, Automation, and Response (SOAR) has become an essential component of robust cybersecurity strategies. 
          By leveraging advanced technologies and intelligent workflows, SOAR platforms provide organizations with unprecedented capabilities to detect, investigate, and mitigate security threats.
        </Typography>
        <Typography variant="body1" paragraph>
          Key benefits include:
          <ul>
            <li>Reduced mean time to detect (MTTD) and mean time to respond (MTTR)</li>
            <li>Consistent and standardized incident handling</li>
            <li>Enhanced collaboration between security teams</li>
            <li>Improved resource allocation and operational efficiency</li>
          </ul>
        </Typography>
      </Paper>

      {/* Upgrade Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#ff5252',
            color: 'white',
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center' }}>
          Access Restricted
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'white', textAlign: 'center' }}>
            {dialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDialog(false)} 
            variant="contained" 
            color="primary"
            sx={{ 
              backgroundColor: 'white', 
              color: '#ff5252',
              '&:hover': { backgroundColor: '#f0f0f0' }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SOARPlaybook;