import React from 'react';
import { Paper, Typography, Grid, Chip, Divider, Box } from '@mui/material';
import {
  Shield,
  FileText,
  User,
  Network,
  Code
} from 'lucide-react';

const LogDetailsView = ({ data }) => {
  if (!data) {
    return (
      <Box p={3}>
        <Typography color="text.secondary">No log data available</Typography>
      </Box>
    );
  }

  const renderChips = (items, color = "primary") => {
    if (!items || !Array.isArray(items) || items.length === 0) return null;
    
    return (
      <Box display="flex" gap={1} flexWrap="wrap">
        {items.map((item, index) => (
          <Chip
            key={index}
            label={item}
            size="small"
            color={color}
            variant="outlined"
            className="font-medium"
          />
        ))}
      </Box>
    );
  };

  const ComplianceSection = ({ title, items }) => {
    if (!items || items.length === 0) return null;
    
    return (
      <Box className="mb-4">
        <Typography variant="subtitle2" color="text.secondary" className="mb-2">
          {title}
        </Typography>
        <Box className="pl-4">
          {renderChips(items)}
        </Box>
      </Box>
    );
  };

  const SectionCard = ({ icon: Icon, title, children }) => (
    <Paper elevation={1} className="p-4 mb-4">
      <Box display="flex" alignItems="center" className="mb-3">
        <Icon className="w-5 h-5 mr-2" />
        <Typography variant="h6" color="primary">
          {title}
        </Typography>
      </Box>
      <Divider className="mb-3" />
      {children}
    </Paper>
  );

  const renderDetailRow = (label, value) => {
    if (!value) return null;
    return (
      <Grid container spacing={2} className="mb-2">
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle2" color="text.secondary">
            {label}:
          </Typography>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography>{value}</Typography>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box className="p-4">
      <SectionCard icon={FileText} title="Basic Information">
        {renderDetailRow("Timestamp", new Date(data.timestamp).toLocaleString())}
        {renderDetailRow("Rule Level", data.rule?.level)}
        {renderDetailRow("Rule ID", data.rule?.id)}
        {renderDetailRow("Description", data.rule?.description)}
      </SectionCard>

      <SectionCard icon={User} title="Agent Information">
        {renderDetailRow("Agent Name", data.agent?.name)}
        {renderDetailRow("Agent ID", data.agent?.id)}
        {renderDetailRow("Manager", data.manager?.name)}
      </SectionCard>

      <SectionCard icon={Shield} title="Compliance Standards">
        <ComplianceSection title="HIPAA" items={data.rule?.hipaa} />
        <ComplianceSection title="PCI DSS" items={data.rule?.pci_dss} />
        <ComplianceSection title="GDPR" items={data.rule?.gdpr} />
        <ComplianceSection title="NIST 800-53" items={data.rule?.nist_800_53} />
        <ComplianceSection title="TSC" items={data.rule?.tsc} />
        <ComplianceSection title="GPG13" items={data.rule?.gpg13} />
      </SectionCard>

      {data.network && (
        <SectionCard icon={Network} title="Network Information">
          {renderDetailRow("Source IP", data.network.srcIp)}
          {renderDetailRow("Source Port", data.network.srcPort)}
          {renderDetailRow("Destination IP", data.network.destIp)}
          {renderDetailRow("Destination Port", data.network.destPort)}
          {renderDetailRow("Protocol", data.network.protocol)}
        </SectionCard>
      )}

      <SectionCard icon={Code} title="Raw Log Data">
        <Paper variant="outlined" className="p-4 bg-gray-50">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.rawData || data, null, 2)}
          </pre>
        </Paper>
      </SectionCard>
    </Box>
  );
};

export default LogDetailsView;