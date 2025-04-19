import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Divider,
  useTheme,
  Chip
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import InsightsIcon from '@mui/icons-material/Insights';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import AutomationIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FeatureAccess = ({ featureId, featureName, children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_URL}/api/auth/access/${featureId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setHasAccess(response.data.access);
      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [featureId, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasAccess) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box 
          sx={{ 
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            color: 'white',
            p: 4,
            mb: 6
          }}
        >
          <Box 
            sx={{ 
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              zIndex: 0
            }} 
          />
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LockIcon sx={{ fontSize: 40, mr: 2 }} />
              <Typography variant="h4" fontWeight="bold">
                Premium Feature Access Required
              </Typography>
            </Box>
            
            <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
              This feature is only available with our Platinum plan
            </Typography>
            
            <Chip 
              label={`${featureName} - Platinum Plan Required`}
              color="secondary"
              sx={{ 
                fontSize: '1rem',
                py: 2.5,
                px: 1,
                fontWeight: 'bold',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '2px solid white',
                mb: 3
              }}
              icon={<SecurityIcon />}
            />
            
            <Typography variant="body1" sx={{ mb: 4, maxWidth: '80%' }}>
              Unlock advanced security capabilities with our Platinum plan. Gain access to cutting-edge AI analysis,
              automated response playbooks, and machine learning-powered threat detection to take your security
              operations to the next level.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  },
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 'bold'
                }}
              >
                Return to Dashboard
              </Button>
              
              <Button 
                variant="outlined"
                size="large"
                sx={{ 
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  },
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 'bold'
                }}
              >
                Contact Administrator
              </Button>
            </Box>
          </Box>
        </Box>
        
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 4 }}>
          Platinum Plan Features
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ height: '100%', p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ color: theme.palette.primary.main, mr: 2, fontSize: 30 }} />
                <Typography variant="h6" fontWeight="bold">SOAR Playbook</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Security Orchestration, Automation, and Response (SOAR) technology integrates all your security tools
                and automates incident response workflows to dramatically reduce response times.
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>• Automated response to common security incidents</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• Pre-built playbooks for different threat scenarios</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• Integration with your existing security tools</Typography>
                <Typography variant="body2">• Reduced mean time to detect and respond (MTTD/MTTR)</Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ height: '100%', p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PsychologyAltIcon sx={{ color: theme.palette.primary.main, mr: 2, fontSize: 30 }} />
                <Typography variant="h6" fontWeight="bold">Sentinel AI</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Advanced AI analysis of security logs and events, providing deeper insights and context to detected threats
                than traditional rule-based systems.
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>• Natural language analysis of security events</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• Contextual threat intelligence enrichment</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• Root cause identification</Typography>
                <Typography variant="body2">• Threat actor tactics, techniques, and procedures (TTPs) mapping</Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ height: '100%', p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InsightsIcon sx={{ color: theme.palette.primary.main, mr: 2, fontSize: 30 }} />
                <Typography variant="h6" fontWeight="bold">Machine Learning Analytics</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Detect anomalies and potential threats that traditional rule-based systems might miss using advanced
                machine learning algorithms trained on vast security datasets.
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>• Anomaly detection for network traffic patterns</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• User behavior analytics</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• Predictive threat intelligence</Typography>
                <Typography variant="body2">• Trend analysis and emerging threat detection</Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ height: '100%', p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TroubleshootIcon sx={{ color: theme.palette.primary.main, mr: 2, fontSize: 30 }} />
                <Typography variant="h6" fontWeight="bold">Advanced Threat Hunting</Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Proactively search for threats that have evaded existing security controls using AI-assisted
                hunting tools and techniques.
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>• Interactive threat hunting dashboards</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• AI-assisted search recommendations</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>• Automated IOC scanning</Typography>
                <Typography variant="body2">• Integration with MITRE ATT&CK framework</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Want to learn more about our Platinum plan?
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Discover how our premium features can enhance your security posture and efficiency
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            sx={{ 
              px: 4, 
              py: 1.5, 
              borderRadius: 2,
              fontWeight: 'bold'
            }}
          >
            Request Demo
          </Button>
        </Box>
      </Container>
    );
  }

  return children;
};

export default FeatureAccess;