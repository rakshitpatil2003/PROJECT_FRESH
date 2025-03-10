import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  //Accordion, 
  //AccordionSummary, 
  //AccordionDetails, 
  Chip, 
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  styled,
  useTheme
} from '@mui/material';
//import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningIcon from '@mui/icons-material/Warning';
import SecurityIcon from '@mui/icons-material/Security';
import DnsIcon from '@mui/icons-material/Dns';
import EventIcon from '@mui/icons-material/Event';
import CodeIcon from '@mui/icons-material/Code';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';

// Keep the parseLogMessage function as it is
export const parseLogMessage = (logEntry) => {
  if (!logEntry) return null;
  
  try {
      // Parse message data
      let messageData;
      if (logEntry.rawLog?.message) {
          try {
              messageData = typeof logEntry.rawLog.message === 'string' ? 
                  JSON.parse(logEntry.rawLog.message) : logEntry.rawLog.message;
          } catch (e) {
              messageData = logEntry.rawLog.message;
          }
      } else if (typeof logEntry.message === 'string') {
          try {
              messageData = JSON.parse(logEntry.message);
          } catch (e) {
              messageData = logEntry.message;
          }
      } else {
          messageData = logEntry.message || logEntry;
      }

      // Extract rule data with new compliance fields
      const ruleData = messageData?.rule || logEntry?.rule || {};
      
      return {
          timestamp: messageData?.data?.timestamp || 
                  messageData?.timestamp || 
                  logEntry?.timestamp || 
                  logEntry?.rawLog?.timestamp,
          agent: {
              name: messageData?.agent?.name || messageData?.manager?.name || logEntry?.agent?.name || 'N/A',
              id: messageData?.agent?.id || 'N/A'
          },
          rule: {
              level: String(ruleData?.level || '0'),
              description: ruleData?.description || 'No description',
              id: ruleData?.id || 'N/A',
              groups: ruleData?.groups || [],
              hipaa: ruleData?.hipaa || [],
              pci_dss: ruleData?.pci_dss || [],
              gdpr: ruleData?.gdpr || [],
              nist_800_53: ruleData?.nist_800_53 || [],
              mitre: ruleData?.mitre || {
                  id: [],
                  tactic: [],
                  technique: []
              },
              tsc: ruleData?.tsc || [],
              gpg13: ruleData?.gpg13 || []
          },
          network: {
              srcIp: messageData?.data?.src_ip || logEntry?.network?.srcIp || logEntry?.source || 'N/A',
              srcPort: messageData?.data?.src_port || 'N/A',
              destIp: messageData?.data?.dest_ip || logEntry?.network?.destIp || 'N/A',
              destPort: messageData?.data?.dest_port || 'N/A',
              protocol: messageData?.data?.proto || logEntry?.network?.protocol || 'N/A',
              flow: {
                  pktsToServer: messageData?.data?.flow?.pkts_toserver || 'N/A',
                  pktsToClient: messageData?.data?.flow?.pkts_toclient || 'N/A',
                  bytesToServer: messageData?.data?.flow?.bytes_toserver || 'N/A',
                  bytesToClient: messageData?.data?.flow?.bytes_toclient || 'N/A',
                  state: messageData?.data?.flow?.state || 'N/A'
              }
          },
          event: {
              type: messageData?.data?.event_type || 'N/A',
              interface: messageData?.data?.in_iface || 'N/A'
          },
          vulnerability: {
              cve: messageData?.data?.vulnerability?.cve || 'N/A',
              package: messageData?.data?.vulnerability?.package || {
                  name: 'N/A',
                  version: 'N/A',
                  architecture: 'N/A',
                  condition: 'N/A'
              },
              severity: messageData?.data?.vulnerability?.severity || 'N/A',
              published: messageData?.data?.vulnerability?.published || 'N/A',
              updated: messageData?.data?.vulnerability?.updated || 'N/A',
              title: messageData?.data?.vulnerability?.title || 'N/A',
              cvss: messageData?.data?.vulnerability?.cvss || {
                  cvss3: { base_score: 'N/A' }
              },
              reference: messageData?.data?.vulnerability?.reference || 'N/A',
              rationale: messageData?.data?.vulnerability?.rationale || 'N/A',
              status: messageData?.data?.vulnerability?.status || 'N/A'
          },
          rawData: messageData
      };
  } catch (error) {
      console.error('Error parsing log message:', error);
      return {
          timestamp: logEntry?.timestamp || new Date().toISOString(),
          agent: { name: 'Parse Error', id: 'N/A' },
          rule: {
              level: '0',
              description: 'Error parsing log data',
              id: 'N/A',
              groups: [],
              hipaa: [],
              pci_dss: [],
              gdpr: [],
              nist_800_53: [],
              mitre: { id: [], tactic: [], technique: [] },
              tsc: [],
              gpg13: []
          },
          network: {
              srcIp: 'N/A', srcPort: 'N/A', destIp: 'N/A', destPort: 'N/A', protocol: 'N/A',
              flow: { pktsToServer: 'N/A', pktsToClient: 'N/A', bytesToServer: 'N/A', bytesToClient: 'N/A', state: 'N/A' }
          },
          event: { type: 'N/A', interface: 'N/A' },
          vulnerability: {
              cve: 'N/A',
              package: { name: 'N/A', version: 'N/A', architecture: 'N/A', condition: 'N/A' },
              severity: 'N/A',
              published: 'N/A',
              updated: 'N/A',
              title: 'N/A',
              cvss: { cvss3: { base_score: 'N/A' } },
              reference: 'N/A',
              rationale: 'N/A',
              status: 'N/A'
          },
          rawData: logEntry
      };
  }
};

// Enhanced StructuredLogView component
export const StructuredLogView = ({ data }) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!data) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No log data available
        </Typography>
      </Box>
    );
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return 'Complex Object';
      }
    }
    return String(value);
  };

  // Get severity color based on rule level
  const getSeverityColor = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 10) return theme.palette.error.main;
    if (numLevel >= 7) return theme.palette.warning.main;
    if (numLevel >= 4) return theme.palette.info.main;
    return theme.palette.success.main;
  };

  // Get severity text based on rule level
  const getSeverityText = (level) => {
    const numLevel = parseInt(level, 10);
    if (numLevel >= 10) return 'Critical';
    if (numLevel >= 7) return 'High';
    if (numLevel >= 4) return 'Medium';
    return 'Low';
  };

  // Custom styled chip component for compliance frameworks
  const ComplianceChip = styled(Chip)(({ theme }) => ({
    margin: theme.spacing(0.5),
    fontWeight: 500,
  }));

  // Get compliance frameworks in a grouped format
  const renderComplianceFrameworks = () => {
    const frameworks = [
      { name: 'HIPAA', items: data.rule.hipaa, color: '#4caf50' },
      { name: 'PCI DSS', items: data.rule.pci_dss, color: '#ff9800' },
      { name: 'GDPR', items: data.rule.gdpr, color: '#2196f3' },
      { name: 'NIST 800-53', items: data.rule.nist_800_53, color: '#9c27b0' },
      { name: 'TSC', items: data.rule.tsc, color: '#795548' },
      { name: 'GPG13', items: data.rule.gpg13, color: '#607d8b' }
    ];

    return (
      <Box>
        {frameworks.map(framework => {
          if (!framework.items || framework.items.length === 0) return null;
          return (
            <Box key={framework.name} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                {framework.name}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', pl: 1 }}>
                {framework.items.map((item, idx) => (
                  <ComplianceChip
                    key={idx}
                    label={item}
                    size="small"
                    sx={{ bgcolor: `${framework.color}15`, color: framework.color }}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Render MITRE ATT&CK information
  const renderMitreSection = () => {
    if (!data.rule.mitre || (!data.rule.mitre.id.length && !data.rule.mitre.tactic.length && !data.rule.mitre.technique.length)) {
      return null;
    }

    const mitreCategories = [
      { name: 'Techniques', items: data.rule.mitre.technique },
      { name: 'Tactics', items: data.rule.mitre.tactic },
      { name: 'IDs', items: data.rule.mitre.id }
    ];

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1, color: '#d32f2f' }}>
          <ShieldIcon sx={{ mr: 1 }} />
          MITRE ATT&CK
        </Typography>
        <Box sx={{ pl: 2 }}>
          {mitreCategories.map(category => {
            if (!category.items || category.items.length === 0) return null;
            return (
              <Box key={category.name} sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {category.name}:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 1 }}>
                  {category.items.map((item, idx) => (
                    <Chip
                      key={idx}
                      label={item}
                      size="small"
                      sx={{
                        bgcolor: '#ffebee',
                        color: '#d32f2f',
                        fontWeight: 500
                      }}
                    />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Render network flow details in a structured grid
  const renderNetworkFlow = () => {
    if (!data.network.flow) return null;
    
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Flow Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">Packets To Server</Typography>
              <Typography variant="body2">{data.network.flow.pktsToServer}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">Packets To Client</Typography>
              <Typography variant="body2">{data.network.flow.pktsToClient}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">Bytes To Server</Typography>
              <Typography variant="body2">{data.network.flow.bytesToServer}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">Bytes To Client</Typography>
              <Typography variant="body2">{data.network.flow.bytesToClient}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">State</Typography>
              <Typography variant="body2">{data.network.flow.state}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  // Format timestamp to be more readable
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <Box sx={{ maxHeight: '80vh', overflow: 'auto' }}>
      <Paper elevation={0} sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {data.rule.description}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {formatTimestamp(data.timestamp)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Chip 
              icon={<WarningIcon />} 
              label={`Level ${data.rule.level} - ${getSeverityText(data.rule.level)}`}
              sx={{ 
                bgcolor: `${getSeverityColor(data.rule.level)}15`,
                color: getSeverityColor(data.rule.level),
                fontWeight: 'bold',
                py: 2
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="log details tabs" variant="scrollable" scrollButtons="auto">
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Rule Details" />
          <Tab icon={<DnsIcon />} iconPosition="start" label="Network" />
          <Tab icon={<EventIcon />} iconPosition="start" label="Event Info" />
          <Tab icon={<LockIcon />} iconPosition="start" label="Compliance" />
          <Tab icon={<CodeIcon />} iconPosition="start" label="Raw Data" />
        </Tabs>
      </Box>

      {/* Rule Details Tab */}
      <Box role="tabpanel" hidden={tabValue !== 0}>
        {tabValue === 0 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Rule Information
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>ID:</strong> {data.rule.id}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Level:</strong> {data.rule.level} ({getSeverityText(data.rule.level)})
                    </Typography>
                    {data.rule.groups && data.rule.groups.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Groups:</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {data.rule.groups.map((group, idx) => (
                            <Chip key={idx} label={group} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Agent Information
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Name:</strong> {data.agent.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>ID:</strong> {data.agent.id}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                {renderMitreSection()}
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* Network Tab */}
      <Box role="tabpanel" hidden={tabValue !== 1}>
        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Source</Typography>
                  <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {data.network.srcIp}
                      {data.network.srcPort !== 'N/A' && `:${data.network.srcPort}`}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Destination</Typography>
                  <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {data.network.destIp}
                      {data.network.destPort !== 'N/A' && `:${data.network.destPort}`}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Protocol</Typography>
                  <Chip 
                    label={data.network.protocol} 
                    size="small" 
                    sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}
                  />
                </Grid>
              </Grid>
              {renderNetworkFlow()}
            </Paper>
          </Box>
        )}
      </Box>

      {/* Event Info Tab */}
      <Box role="tabpanel" hidden={tabValue !== 2}>
        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Event Details
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">Event Type</Typography>
                    <Typography variant="body1">{data.event.type}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">Interface</Typography>
                    <Typography variant="body1">{data.event.interface}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                    <Typography variant="body1">{formatTimestamp(data.timestamp)}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Compliance Tab */}
      <Box role="tabpanel" hidden={tabValue !== 3}>
        {tabValue === 3 && (
          <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <LockIcon sx={{ mr: 1 }} />
                Compliance Frameworks
              </Typography>
              <Box sx={{ mt: 2 }}>
                {renderComplianceFrameworks()}
              </Box>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Raw Data Tab */}
      <Box role="tabpanel" hidden={tabValue !== 4}>
        {tabValue === 4 && (
          <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  Raw Data
                </Typography>
                <Tooltip title="Copy raw data">
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(JSON.stringify(data.rawData, null, 2))}
                    sx={{ bgcolor: '#f5f5f5' }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box 
                component="pre" 
                sx={{ 
                  bgcolor: '#f8f9fa', 
                  p: 2, 
                  borderRadius: 1, 
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontSize: '0.875rem'
                }}
              >
                {JSON.stringify(data.rawData, null, 2)}
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};