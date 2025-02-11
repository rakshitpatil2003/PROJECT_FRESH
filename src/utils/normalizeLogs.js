// utils/normalizeLogs.js

export const parseLogMessage = (logEntry) => {
  if (!logEntry) return null;
  
  try {
    // First try to parse the rawLog message if it exists
    let messageData;
    if (logEntry.rawLog?.message) {
      try {
        messageData = JSON.parse(logEntry.rawLog.message);
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

    // Extract nested data
    const data = messageData?.data || {};
    const flow = data?.flow || {};
    const ruleData = messageData?.rule || logEntry?.rule || {};
    
    return {
      timestamp: logEntry.timestamp || messageData?.timestamp || logEntry.rawLog?.timestamp,
      agent: {
        name: messageData?.agent?.name || messageData?.manager?.name || logEntry?.agent?.name || 'N/A',
        id: messageData?.agent?.id || 'N/A'
      },
      rule: {
        level: ruleData?.level || '0',
        description: ruleData?.description || 'No description',
        id: ruleData?.id || 'N/A',
        groups: ruleData?.groups || []
      },
      network: {
        srcIp: data?.src_ip || logEntry?.network?.srcIp || logEntry?.source || 'N/A',
        srcPort: data?.src_port || 'N/A',
        destIp: data?.dest_ip || logEntry?.network?.destIp || 'N/A',
        destPort: data?.dest_port || 'N/A',
        protocol: data?.proto || logEntry?.network?.protocol || 'N/A',
        flow: {
          pktsToServer: flow?.pkts_toserver || 'N/A',
          pktsToClient: flow?.pkts_toclient || 'N/A',
          bytesToServer: flow?.bytes_toserver || 'N/A',
          bytesToClient: flow?.bytes_toclient || 'N/A',
          state: flow?.state || 'N/A'
        }
      },
      event: {
        type: data?.event_type || 'N/A',
        interface: data?.in_iface || 'N/A'
      },
      rawData: messageData
    };
  } catch (error) {
    console.error('Error parsing log message:', error);
    // Return a valid object with default values
    return {
      timestamp: logEntry?.timestamp || new Date().toISOString(),
      agent: { name: 'Parse Error', id: 'N/A' },
      rule: { level: '0', description: 'Error parsing log data', id: 'N/A', groups: [] },
      network: {
        srcIp: 'N/A', srcPort: 'N/A', destIp: 'N/A', destPort: 'N/A', protocol: 'N/A',
        flow: { pktsToServer: 'N/A', pktsToClient: 'N/A', bytesToServer: 'N/A', bytesToClient: 'N/A', state: 'N/A' }
      },
      event: { type: 'N/A', interface: 'N/A' },
      rawData: logEntry
    };
  }
};

export const StructuredLogView = ({ data }) => {
  if (!data) {
    return <div className="p-4">No log data available</div>;
  }

  const renderValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderSection = (title, content) => {
    if (!content || Object.keys(content).length === 0) return null;
    
    return (
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-blue-600 mb-2">{title}</h3>
        <div className="pl-4">
          {Object.entries(content).map(([key, value]) => {
            if (value === null || value === undefined) return null;
            
            if (typeof value === 'object' && !Array.isArray(value)) {
              return (
                <div key={key} className="mb-2">
                  <h4 className="text-md font-medium text-gray-700">{key}:</h4>
                  <div className="pl-4">
                    {Object.entries(value).map(([subKey, subValue]) => (
                      <div key={subKey} className="text-sm">
                        <span className="text-gray-600">{subKey}:</span>{' '}
                        <span className="text-gray-900">{renderValue(subValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            
            return (
              <div key={key} className="text-sm">
                <span className="text-gray-600">{key}:</span>{' '}
                <span className="text-gray-900">{renderValue(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {renderSection('Agent Information', data.agent)}
      {renderSection('Rule Details', data.rule)}
      {renderSection('Network Information', data.network)}
      {renderSection('Event Details', data.event)}
      {data.rawData && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">Raw Data</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data.rawData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};