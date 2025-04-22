import React from 'react';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

// Metric component without animation
const MetricDisplay = ({ value, label, color, icon, onClick = null, tooltip = null }) => {
  const theme = useTheme();
  const isClickable = Boolean(onClick);
  
  const content = (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mx: 1.5,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: isClickable ? 'scale(1.05)' : 'none'
        }
      }}
      onClick={onClick}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: `${color}20`, // Using semi-transparent color
          color: color,
          borderRadius: '50%',
          p: 1,
          mb: 0.5
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: color, lineHeight: 1 }}>
        {value.toLocaleString()}
      </Typography>
      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>
        {label}
      </Typography>
    </Box>
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
  
  // Use default values if metrics is not yet loaded
  const totalLogs = metrics?.totalLogs || 0;
  const majorLogs = metrics?.majorLogs || 0;
  const normalLogs = metrics?.normalLogs || 0;
  const tickets = ticketCount || 0;
  
  const handleMajorLogsClick = () => {
    navigate('/major-logs');
  };
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        p: 0.5,
        borderRadius: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
      }}
    >
      <MetricDisplay 
        value={totalLogs} 
        label="Total Logs" 
        color="#2196f3" 
        icon={<AssessmentIcon />}
        tooltip="Total logs collected"
      />
      
      <MetricDisplay 
        value={majorLogs} 
        label="Major Logs" 
        color="#f44336" 
        icon={<WarningAmberIcon />}
        onClick={handleMajorLogsClick}
        tooltip="Click to view major logs"
      />
      
      <MetricDisplay 
        value={normalLogs} 
        label="Normal Logs" 
        color="#4caf50" 
        icon={<CheckCircleIcon />}
        tooltip="Non-critical logs"
      />
      
      <MetricDisplay 
        value={tickets} 
        label="Tickets" 
        color="#ff9800" 
        icon={<ConfirmationNumberIcon />}
        tooltip="Total tickets generated"
      />
    </Box>
  );
};

export default HeaderKeyMetrics;