import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';  // Import the API URL
import {Box,Card,CardContent,TextField,Button,Typography,Alert,Tabs,Tab,
} from '@mui/material';
import { keyframes } from '@emotion/react';
import logoImage from '../assets/images/vg-logo.png';
import backgroundImage from '../assets/images/background_2.jpg';
//import config from '../config';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  // Add global styles to document
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #root {
        height: 100vh;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const loginUrl = `${API_URL}/api/auth/login`;
    console.log('Attempting login to:', loginUrl);

    try {
      // Additional validation based on current tab
      if (tabValue === 0 && !credentials.username.toLowerCase().includes('admin')) {
        setError('Please use an admin account in the Admin Login tab');
        return;
      }
      if (tabValue === 1 && credentials.username.toLowerCase().includes('admin')) {
        setError('Admin accounts cannot login in the User Login tab');
        return;
      }
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error('Login failed');
      }
      const data = await response.json();
      console.log('Response data:', data);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userInfo', JSON.stringify(data.user));
        console.log('Token stored:', data.token);
        console.log('User info stored:', data.user);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Server connection failed. Please verify the server is running.');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Reset credentials when switching tabs
    setCredentials({ username: '', password: '' });
    setError('');
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
      }}
    >
      <Card
        sx={{
          width: '400px',
          padding: '24px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          animation: `${fadeIn} 0.5s ease-in-out`,
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <img
              src={logoImage}
              alt="VGI Logo"
              style={{ width: '200px', height: 'auto' }}
            />
          </Box>

          {/* Tabs for Login */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="Admin Login" />
            <Tab label="User Login" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 3,
              fontWeight: 'bold',
              color: '#333',
            }}
          >
            {tabValue === 0 ? 'Admin Login' : 'User Login'}
          </Typography>

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: '#1976d2',
                '&:hover': { backgroundColor: '#1565c0' },
                py: 1.5,
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;