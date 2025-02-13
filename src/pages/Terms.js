// Terms.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Terms = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Terms of Service
          </Typography>
          <Typography paragraph>
            Welcome to Virtual Galaxy Infotech Limited. By accessing and using our services,
            you agree to comply with and be bound by the following terms and conditions.
          </Typography>
          {/* Add more content as needed */}
        </Paper>
      </Container>
    </Box>
  );
};

export default Terms;