export const normalizeLogs = (logs) => {
    if (!Array.isArray(logs)) {
      console.warn('normalizeLogs received invalid input:', logs);
      return [];
    }
  
    return logs.map(log => {
      try {
        // If log is already in our processed format, return as is
        if (log.agent && log.network && log.rule && log.event) {
          return log;
        }
  
        // If log is in raw Graylog format, process it
        const message = log.message || log;
        const winData = message.data?.win || {};
        const eventData = winData.eventdata || {};
        const systemData = winData.system || {};
  
        return {
          timestamp: message.timestamp || message.true,
          rawTimestamp: message.timestamp || (message.true ? new Date(message.true * 1000).toISOString() : null),
          agent: {
            name: message.agent?.name || systemData.computer || 'N/A',
            id: message.agent?.id || 'N/A',
            ip: message.agent?.ip || eventData.sourceIp || 'N/A'
          },
          rule: {
            level: message.rule?.level || 0,
            description: message.rule?.description || 'N/A',
            groups: message.rule?.groups || [],
            id: message.rule?.id || 'N/A'
          },
          event: {
            id: systemData.eventID || 'N/A',
            provider: systemData.providerName || 'N/A',
            message: systemData.message || 'N/A'
          },
          network: {
            protocol: eventData.protocol || 'N/A',
            sourceIp: eventData.sourceIp || message.agent?.ip || 'N/A',
            sourcePort: eventData.sourcePort || 'N/A',
            destinationIp: eventData.destinationIp || 'N/A',
            destinationPort: eventData.destinationPort || 'N/A'
          },
          process: {
            id: eventData.processId || systemData.processID || 'N/A',
            user: eventData.user || 'N/A',
            image: eventData.image || 'N/A'
          }
        };
      } catch (error) {
        console.error('Error normalizing log entry:', error);
        return null;
      }
    }).filter(Boolean); // Remove null entries
  };