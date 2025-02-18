// Disclaimer.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Disclaimer = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'blue' }}>
            Disclaimer
          </Typography>

          <Typography paragraph>
            According to the terms and conditions dictated in Terms of Use and this Disclaimer, Virtual Galaxy Infotech Limited (VGIL) grants you a non-exclusive, non-transferable, restricted, and limited right to access, use, and display this website along with its contents.  
          </Typography>

          <Typography paragraph>
            You agree and acknowledge that you will not interrupt the functioning of this website in any manner whatsoever. As a user of this website, you must agree to access and use it in accordance with the terms and conditions stated in Terms of Use and this Disclaimer.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
            Use of Website Information
          </Typography>

          <Typography paragraph>
            Except as otherwise indicated elsewhere on this website, as a user or visitor of this website, you may view, copy, print, and download the data/information available on this website under the following conditions:
          </Typography>

          <Typography component="ul" sx={{ pl: 3 }}>
            <Typography component="li">
              The information on this website is exclusively used for personal and informational purposes.
            </Typography>
            <Typography component="li">
              The information may not be amended or changed in any way.
            </Typography>
            <Typography component="li">
              Any copied information or part thereof must include the copyright notice along with this permission notice.
            </Typography>
            <Typography component="li">
              You agree to any additional restrictions on using this website as displayed and updated from time to time.
            </Typography>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Disclaimer;
