// Disclaimer.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Disclaimer = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Disclaimer
          </Typography>
          <Typography paragraph>
            The information provided on this website is for general informational purposes only.
            Virtual Galaxy Infotech Limited makes no representations or warranties about the
            accuracy or completeness of the information provided.
          </Typography>
          {/* Add more content as needed */}
        </Paper>
      </Container>
    </Box>
  );
};

export default Disclaimer;