import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Sidebar from './components/sidebar';
import Dashboard from './pages/Dashboard';
import LogDetails from './pages/LogDetails';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import PerformanceDashboard from './pages/PerformanceDashboard';
import SecurityScore from './pages/SecurityScore';
import Login from './components/Login';
import MajorLogs from './pages/MajorLogs';
import SessionLogs from './pages/SessionLogs'; // New import
import Footer from './components/Footer';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Disclaimer from './pages/Disclaimer';
import Policies from './pages/Policies';
import HIPAADashboard from './components/HipaaDashboard';
import MitreAttack from './components/MitreAttack';
import VulnerabilityDetection from './components/VulnerabilityDetection';
import ThreatHunting from './components/ThreatHunting';
import FIMUpgradeModal from './components/FIMUpgradeModal';
import jwtDecode from 'jwt-decode';
import GDPRDashboard from './components/GDPRDashboard';
import NISTDashboard from './components/NISTDashboard';
import PCIDSSDashboard from './components/PCIDSSDashboard';
import TSCDashboard from './components/TSCDashboard';
import NewsTicker from './components/NewsTicker';
import UserDetails from './pages/UserDetails';
import FIM from './pages/FIM';
import SOARPlaybook from './pages/SOARPlaybook';
import Malware from './pages/Malware';
import Configuration from './pages/Configuration';
import SentinelAI from './pages/SentinelAI';


const ProtectedLayout = ({ children, toggleTheme, isDarkMode }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // Check token expiration
    if (decoded.exp < currentTime) {
      localStorage.removeItem('token');
      return <Navigate to="/login" />;
    }

    // Check plan expiry
    const userInfo = decoded.userInfo;
    if (userInfo.planExpiryDate) {
      const expiryDate = new Date(userInfo.planExpiryDate);
      if (expiryDate < new Date()) {
        localStorage.removeItem('token');
        return <Navigate to="/login" />;
      }
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', flex: 1 }}>
          <Sidebar toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              backgroundColor: 'background.default',
              minHeight: '100vh',
              width: `calc(100% - 240px)`,
              marginLeft: '0',
              paddingBottom: '150px'
            }}
          >
            {children}
          </Box>
        </Box>
        <NewsTicker />
        <Footer />
      </Box>
    );
  } catch (error) {
    console.error('Error decoding token:', error);
    localStorage.removeItem('token');
    return <Navigate to="/login" />;
  }
};

const App = () => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'dark' ? {
            primary: {
              main: '#90caf9',
            },
            secondary: {
              main: '#f48fb1',
            },
            background: {
              default: '#2A4364', // Updated dark mode default background color
              paper: '#1e1e1e',
            },
            text: {
              primary: '#ffffff',
              secondary: 'rgba(255, 255, 255, 0.7)',
            },
          } : {
            primary: {
              main: '#1976d2',
            },
            secondary: {
              main: '#dc004e',
            },
            background: {
              default: '#f5f5f5',
              paper: '#ffffff',
            },
            text: {
              primary: '#000000', // Ensure text is viewable in light mode
              secondary: 'rgba(0, 0, 0, 0.7)',
            },
          }),
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? '#272727' : '#ffffff',
              },
            },
          },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <LogDetails />
              </ProtectedLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <AdvancedAnalytics />
              </ProtectedLayout>
            }
          />
          <Route
            path="/performance-dashboard"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <PerformanceDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/security-score"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <SecurityScore />
              </ProtectedLayout>
            }
          />
          <Route
            path="/major-logs"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <MajorLogs />
              </ProtectedLayout>
            }
          />
          <Route
            path="/malware"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <Malware />
              </ProtectedLayout>
            }
          />
          <Route
            path="/configuration"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <Configuration />
              </ProtectedLayout>
            }
          />
          <Route
            path="/sentinel-ai"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <SentinelAI />
              </ProtectedLayout>
            }
          />
          <Route
            path="/fim"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                {(() => {
                  const token = localStorage.getItem('token');
                  const user = token ? jwtDecode(token).userInfo : null;

                  if (user && user.plan === 'Platinum') {
                    return <FIM />;
                  } else {
                    return (
                      <Box sx={{ position: 'relative', height: '100%' }}>
                        <FIMUpgradeModal
                          onClose={() => {
                            // Add any specific close logic if needed
                          }}
                        />
                        <Box sx={{ filter: 'blur(5px)', pointerEvents: 'none' }}>                          <FIM />
                        </Box>
                      </Box>
                    );
                  }
                })()}
              </ProtectedLayout>
            }
          />
          {/* New Route for Session Logs */}
          <Route
            path="/session-logs"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <SessionLogs />
              </ProtectedLayout>
            }
          />
          {/*Security Policy Routes*/}
          <Route
            path="/hipaa-dashboard"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <HIPAADashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/gdpr-dashboard"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <GDPRDashboard />
              </ProtectedLayout>
            }
          />

          <Route
            path="/pcidss-dashboard"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <PCIDSSDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/nist-dashboard"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <NISTDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/tsc-dashboard"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <TSCDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/mitre-attack"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <MitreAttack />
              </ProtectedLayout>
            }
          />
          <Route
            path="/threat-hunting"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <ThreatHunting />
              </ProtectedLayout>
            }
          />
          <Route
            path="/vulnerability"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <VulnerabilityDetection />
              </ProtectedLayout>
            }
          />
          <Route
            path="/soar-playbook"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <SOARPlaybook />
              </ProtectedLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <UserDetails />
              </ProtectedLayout>
            }
          />
          {/* Footer Pages Routes */}
          <Route
            path="/terms"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <Terms />
              </ProtectedLayout>
            }
          />
          <Route
            path="/privacy"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <Privacy />
              </ProtectedLayout>
            }
          />
          <Route
            path="/disclaimer"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <Disclaimer />
              </ProtectedLayout>
            }
          />
          <Route
            path="/policies"
            element={
              <ProtectedLayout toggleTheme={toggleTheme} isDarkMode={mode === 'dark'}>
                <Policies />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;