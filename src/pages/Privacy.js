// Privacy.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Privacy = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Privacy Policy
          </Typography>
          <Typography paragraph>
            Virtual Galaxy Infotech Limited is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, and safeguard your personal information.
          </Typography>
          {/* Add more content as needed */}
        </Paper>
      </Container>
    </Box>
  );
};

export default Privacy;