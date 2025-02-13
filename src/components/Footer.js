import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light' ? '#f5f5f5' : '#1e1e1e',
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        position: 'fixed',
        bottom: 0,
        //width: '100%',
        zIndex: 1000,
        marginLeft: '240px', // Width of sidebar
        width: 'calc(100% - 240px)' // Adjust width to account for sidebar
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Copyright © 2025 Virtual Galaxy Infotech Limited. All rights reserved.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link
                component={RouterLink}
                to="/terms"
                color="text.secondary"
                sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                Terms
              </Link>
              <Link
                component={RouterLink}
                to="/privacy"
                color="text.secondary"
                sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                Privacy
              </Link>
              <Link
                component={RouterLink}
                to="/disclaimer"
                color="text.secondary"
                sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                Disclaimer
              </Link>
              <Link
                component={RouterLink}
                to="/policies"
                color="text.secondary"
                sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                Policies
              </Link>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link
                href="https://www.instagram.com/virtualgalaxyinfotech"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <InstagramIcon sx={{ fontSize: 20 }} />
              </Link>
              <Link
                href="https://www.linkedin.com/company/virtualgalaxy/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <LinkedInIcon sx={{ fontSize: 20 }} />
              </Link>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;