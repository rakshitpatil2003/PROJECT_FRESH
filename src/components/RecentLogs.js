// RecentLogs.js
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Link,
  IconButton,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { parseLogMessage, StructuredLogView } from '../utils/normalizeLogs';

const RecentLogs = ({ logs }) => {
  const [selectedLog, setSelectedLog] = useState(null);

  const formatTimestamp = (timestamp) => {
    try {
      if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  const getRuleLevelColor = (level) => {
    const numLevel = parseInt(level);
    if (numLevel >= 12) return 'error';
    if (numLevel >= 8) return 'warning';
    if (numLevel >= 4) return 'info';
    return 'success';
  };

  if (!Array.isArray(logs) || logs.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="body1" color="text.secondary" align="center">
          No logs available
        </Typography>
      </Box>
    );
  }

  const handleClickOpen = (log) => {
    const parsedLog = parseLogMessage(log);
    setSelectedLog(parsedLog);
  };

  const handleClose = () => {
    setSelectedLog(null);
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Timestamp</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Agent Name</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Rule Level</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Source IP</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Description</TableCell>
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, index) => {
              const parsedLog = parseLogMessage(log);
              return (
                <TableRow key={index} hover>
                  <TableCell>{formatTimestamp(parsedLog.timestamp)}</TableCell>
                  <TableCell>{parsedLog.agent.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={parsedLog.rule.level} 
                      color={getRuleLevelColor(parsedLog.rule.level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{parsedLog.network.srcIp}</TableCell>
                  <TableCell>{parsedLog.rule.description}</TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => handleClickOpen(log)}
                      sx={{ textAlign: 'left', cursor: 'pointer' }}
                    >
                      View Details
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(selectedLog)}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Log Details
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <StructuredLogView data={selectedLog} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecentLogs;