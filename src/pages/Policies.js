// Policies.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Policies = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Company Policies
          </Typography>
          <Typography paragraph>
            This page outlines the various policies that govern our operations at
            Virtual Galaxy Infotech Limited, including our operational procedures,
            security protocols, and compliance measures.
          </Typography>
          {/* Add more content as needed */}
        </Paper>
      </Container>
    </Box>
  );
};

export default Policies;