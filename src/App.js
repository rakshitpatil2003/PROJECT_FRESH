import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './components/sidebar';
import Dashboard from './pages/Dashboard';
import LogDetails from './pages/LogDetails';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import PerformanceDashboard from './pages/PerformanceDashboard';
import SecurityScore from './pages/SecurityScore';
import Login from './components/Login';
import MajorLogs from './pages/MajorLogs';

import jwtDecode from 'jwt-decode';

const ProtectedLayout = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      localStorage.removeItem('token'); // Remove expired token
      return <Navigate to="/login" />;
    }
  } catch (error) {
    console.error('Error decoding token:', error);
    localStorage.removeItem('token'); // Remove invalid token
    return <Navigate to="/login" />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            localStorage.getItem('token') ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedLayout>
              <LogDetails />
            </ProtectedLayout>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedLayout>
              <AdvancedAnalytics />
            </ProtectedLayout>
          }
        />
        <Route
          path="/performance-dashboard"
          element={
            <ProtectedLayout>
              <PerformanceDashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/security-score"
          element={
            <ProtectedLayout>
              <SecurityScore />
            </ProtectedLayout>
          }
        />
        <Route
          path="/major-logs"
          element={
            <ProtectedLayout>
              <MajorLogs />
            </ProtectedLayout>
          }
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;