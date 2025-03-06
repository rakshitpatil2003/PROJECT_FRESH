import { createTheme } from '@mui/material';

export const chartTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#90caf9',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff4081',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
    },
    info: {
      main: '#0288d1',
      light: '#29b6f6',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
    },
  },
});