import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  CircularProgress
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FeatureAccess = ({ featureId, featureName, children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <Card sx={{ maxWidth: 500, textAlign: 'center', py: 4, px: 2 }}>
          <CardContent>
            <LockIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>
              Premium Feature
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {`The ${featureName} feature is only available for users with a Platinum plan. Please contact your administrator to upgrade your plan.`}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return children;
};

export default FeatureAccess;