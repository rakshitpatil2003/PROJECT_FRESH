import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Security as SecurityIcon, 
  Notifications as NotificationsIcon, 
  VerifiedUser as VerifiedUserIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const FIMUpgradeModal = ({ onUpgrade }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Color palette for light and dark themes
  const colorPalette = {
    light: {      
      text: '#333',
      iconColor: '#d32f2f',
      cardBackground: '#ffffff'
    },
    dark: {     
      text: '#ffffff',
      iconColor: '#ff6b6b',
      cardBackground: '#424242'
    }
  };

  // Determine current theme mode (you'd typically get this from a theme context)
  const isDarkMode = theme.palette.mode === 'dark';
  const colors = isDarkMode ? colorPalette.dark : colorPalette.light;

  // Benefits of File Integrity Monitoring
  const benefits = [
    {
      icon: <SecurityIcon />,
      title: 'Advanced Threat Detection',
      description: 'Instantly detect unauthorized changes to critical system files.'
    },
    {
      icon: <NotificationsIcon />,
      title: 'Real-time Alerts',
      description: 'Receive immediate notifications for any unexpected modifications.'
    },
    {
      icon: <VerifiedUserIcon />,
      title: 'Compliance Assurance',
      description: 'Meet security compliance requirements with comprehensive file tracking.'
    },
    {
      icon: <ShieldIcon />,
      title: 'Proactive Security',
      description: 'Prevent potential security breaches before they escalate.'
    }
  ];

  return (
    <Box 
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        backdropFilter: 'blur(5px)'
      }}
    >
      <Paper 
        component={motion.div}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        elevation={6} 
        sx={{ 
          p: 4, 
          textAlign: 'center', 
          maxWidth: isMobile ? '90%' : 600,
          width: '100%',
          backgroundColor: colors.cardBackground,
          borderRadius: 4,
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          zIndex: 1100 
        }}
      >
        <Typography 
          variant="h4" 
          color="primary" 
          gutterBottom
          sx={{ 
            mb: 3, 
            fontWeight: 'bold',
            color: colors.text
          }}
        >
          File Integrity Monitoring (FIM)
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 3, 
            color: colors.text,
            opacity: 0.8 
          }}
        >
          Protect your system's critical files with advanced monitoring and 
          real-time threat detection. Upgrade to the Platinum Plan to 
          safeguard your digital infrastructure.
        </Typography>

        {/* Benefits Grid */}
        <Box 
          sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: 2,
            mb: 3
          }}
        >
          {benefits.map((benefit, index) => (
            <Box
              key={index}
              component={motion.div}
              whileHover={{ scale: 1.05 }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                backgroundColor: colors.background,
                transition: 'transform 0.3s ease'
              }}
            >
              {React.cloneElement(benefit.icon, { 
                sx: { 
                  color: colors.iconColor, 
                  mr: 2, 
                  fontSize: 40 
                } 
              })}
              <Box>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: colors.text 
                  }}
                >
                  {benefit.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: colors.text,
                    opacity: 0.7 
                  }}
                >
                  {benefit.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Button 
          variant="contained" 
          color="primary"
          onClick={onUpgrade}
          component={motion.button}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          sx={{ 
            mt: 2, 
            px: 4, 
            py: 1.5,
            borderRadius: 3 
          }}
        >
          Upgrade to Platinum Plan
        </Button>
      </Paper>
    </Box>
  );
};

export default FIMUpgradeModal;