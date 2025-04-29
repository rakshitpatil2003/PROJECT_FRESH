import React, { useEffect, useState } from 'react';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShieldIcon from '@mui/icons-material/Shield';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { motion } from 'framer-motion';

// Helper function to format numbers with K, M, B suffixes
const formatNumber = (num) => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Compact metric component with animation
const MetricDisplay = ({ value, label, color, icon, onClick = null, tooltip = null }) => {
  const theme = useTheme();
  const isClickable = Boolean(onClick);
  
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={isClickable ? { scale: 1.05 } : {}}
    >
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mx: 1,
          cursor: isClickable ? 'pointer' : 'default',
        }}
        onClick={onClick}
      >
        <motion.div
          whileHover={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: `${color}20`, 
              color: color,
              borderRadius: '50%',
              p: 0.8,
              mb: 0.5,
              boxShadow: `0 0 5px ${color}40`,
            }}
          >
            {React.cloneElement(icon, { fontSize: "small" })}
          </Box>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
        >
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 'bold', 
              color: color, 
              lineHeight: 1,
              fontSize: '1rem'
            }}
          >
            {formatNumber(value)}
          </Typography>
        </motion.div>
        <Typography 
          variant="caption" 
          sx={{ 
            color: theme.palette.text.secondary, 
            textAlign: 'center', 
            fontSize: '0.65rem',
            mt: 0.2
          }}
        >
          {label}
        </Typography>
      </Box>
    </motion.div>
  );
  
  return tooltip ? (
    <Tooltip title={tooltip} arrow placement="bottom">
      {content}
    </Tooltip>
  ) : content;
};

const HeaderKeyMetrics = ({ metrics, ticketCount }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [animatedMetrics, setAnimatedMetrics] = useState({
    totalLogs: 0,
    majorLogs: 0,
    normalLogs: 0,
    tickets: 0
  });
  
  // Animate counting up to target values
  useEffect(() => {
    // Use default values if metrics is not yet loaded
    const totalLogs = metrics?.totalLogs || 0;
    const majorLogs = metrics?.majorLogs || 0;
    const normalLogs = metrics?.normalLogs || 0;
    const tickets = ticketCount || 0;
    
    const duration = 1500; // Animation duration in ms
    const steps = 20; // Number of steps in animation
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setAnimatedMetrics({
        totalLogs: Math.floor(progress * totalLogs),
        majorLogs: Math.floor(progress * majorLogs),
        normalLogs: Math.floor(progress * normalLogs),
        tickets: Math.floor(progress * tickets)
      });
      
      if (step >= steps) {
        clearInterval(timer);
        setAnimatedMetrics({
          totalLogs,
          majorLogs,
          normalLogs,
          tickets
        });
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [metrics, ticketCount]);
  
  const handleMajorLogsClick = () => {
    navigate('/major-logs');
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 0.8,
          borderRadius: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
          width: 'fit-content',
          margin: '0 auto'
        }}
      >
        <MetricDisplay 
          value={animatedMetrics.totalLogs} 
          label="Total Events" 
          color="#2196f3" 
          icon={<AssessmentIcon />}
          tooltip="Total events collected across all time periods"
        />
        
        <MetricDisplay 
          value={animatedMetrics.majorLogs} 
          label="Critical Events" 
          color="#f44336" 
          icon={<WarningAmberIcon />}
          onClick={handleMajorLogsClick}
          tooltip="Click to view critical events"
        />
        
        <MetricDisplay 
          value={animatedMetrics.normalLogs} 
          label="Security Events" 
          color="#4caf50" 
          icon={<ShieldIcon />}
          tooltip="Security events logged"
        />
        
        <MetricDisplay 
          value={animatedMetrics.tickets} 
          label="Tickets" 
          color="#ff9800" 
          icon={<ConfirmationNumberIcon />}
          tooltip="Total tickets generated"
        />
      </Box>
    </motion.div>
  );
};

export default HeaderKeyMetrics;