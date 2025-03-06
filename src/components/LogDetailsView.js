// src/components/LogDetailsView.js
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Info as InfoIcon,
  Check as CheckIcon
} from '@mui/icons-material';

const LogDetailsView = ({ data }) => {
  if (!data) return null;

  const renderSection = (title, content, icon, bgcolor) => {
    if (!content) return null;

    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2, 
          bgcolor: bgcolor,
          borderLeft: '4px solid',
          borderColor: 'primary.main'
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Grid container spacing={2}>
          {Object.entries(content).map(([key, value]) => (
            value && (
              <Grid item xs={12} sm={6} key={key}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary" variant="body2">
                    {key}:
                  </Typography>
                  <Typography variant="body2">
                    {Array.isArray(value) ? (
                      <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                        {value.map((item, index) => (
                          <Chip
                            key={index}
                            label={item}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    ) : (
                      String(value)
                    )}
                  </Typography>
                </Box>
              </Grid>
            )
          ))}
        </Grid>
      </Paper>
    );
  };

  // Parse the raw log if it exists
  const rawLog = data.rawLog?.message ? 
    (typeof data.rawLog.message === 'string' ? 
      JSON.parse(data.rawLog.message) : 
      data.rawLog.message) : 
    data;

  // Extract relevant data
  const agentInfo = {
    Name: rawLog.agent?.name || data.agent?.name || 'N/A',
    ID: rawLog.agent?.id || data.agent?.id || 'N/A',
    IP: rawLog.agent?.ip || 'N/A'
  };

  const ruleInfo = {
    Level: rawLog.rule?.level || data.rule?.level || 'N/A',
    Description: rawLog.rule?.description || data.rule?.description || 'N/A',
    ID: rawLog.rule?.id || data.rule?.id || 'N/A',
    Groups: rawLog.rule?.groups || data.rule?.groups || []
  };

  const standardsInfo = {
    HIPAA: rawLog.rule?.hipaa || data.rule?.hipaa || [],
    'PCI DSS': rawLog.rule?.pci_dss || data.rule?.pci_dss || [],
    GDPR: rawLog.rule?.gdpr || data.rule?.gdpr || [],
    'NIST 800-53': rawLog.rule?.nist_800_53 || data.rule?.nist_800_53 || [],
    TSC: rawLog.rule?.tsc || data.rule?.tsc || []
  };

  return (
    <Box sx={{ p: 2 }}>
      {renderSection(
        'Agent Information',
        agentInfo,
        <ShieldIcon color="primary" />,
        '#f5f5f5'
      )}
      
      {renderSection(
        'Rule Details',
        ruleInfo,
        <InfoIcon color="primary" />,
        '#fafafa'
      )}
      
      {renderSection(
        'Compliance Standards',
        standardsInfo,
        <CheckIcon color="primary" />,
        '#f5f5f5'
      )}
    </Box>
  );
};

export default LogDetailsView;