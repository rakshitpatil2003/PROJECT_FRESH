import React from 'react';
import { Box, Typography } from '@mui/material';

const Header = () => {
  return (
    <Box display="flex" justifyContent="flex-start" alignItems="center" mb={4}>
      <Typography 
        variant="h3" 
        sx={{ 
          fontWeight: 700,
          color: '#1976d2',
          letterSpacing: '0.5px',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        Log Analysis Dashboard
      </Typography>
    </Box>
  );
};

export default Header;