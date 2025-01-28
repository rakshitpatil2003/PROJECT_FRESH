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
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const RecentLogs = ({ logs }) => {
  const [selectedLog, setSelectedLog] = useState(null);

  if (!Array.isArray(logs) || logs.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="body1" color="text.secondary" align="center">
          No logs available
        </Typography>
      </Box>
    );
  }

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

  const handleClickOpen = (log) => {
    setSelectedLog(log);
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
              <TableCell style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={index} hover>
                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell>{log.agent?.name || 'N/A'}</TableCell>
                <TableCell>{log.rule?.level || 'N/A'}</TableCell>
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
            ))}
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
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {selectedLog ? JSON.stringify(selectedLog.rawLog, null, 2) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecentLogs;