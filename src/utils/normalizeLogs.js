// utils/normalizeLogs.js
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
        // New compliance and security framework fields
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

  const renderComplianceSection = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-2">
        <span className="text-gray-600">{title}:</span>
        <div className="pl-4 flex flex-wrap gap-1">
          {items.map((item, idx) => (
            <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderMitreSection = () => {
    if (!data.rule.mitre || (!data.rule.mitre.id && !data.rule.mitre.tactic && !data.rule.mitre.technique)) {
      return null;
    }

    return (
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-700 mb-2">MITRE ATT&CK:</h4>
        <div className="pl-4">
          {renderComplianceSection('Techniques', data.rule.mitre.technique)}
          {renderComplianceSection('Tactics', data.rule.mitre.tactic)}
          {renderComplianceSection('IDs', data.rule.mitre.id)}
        </div>
      </div>
    );
  };

  const renderSection = (title, content) => {
    if (!content || Object.keys(content).length === 0) return null;
    
    return (
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-blue-600 mb-2">{title}</h3>
        <div className="pl-4">
          {title === 'Rule Details' ? (
            <>
              <div className="mb-2">
                <span className="text-gray-600">Level:</span>{' '}
                <span className="text-gray-900">{content.level}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-600">Description:</span>{' '}
                <span className="text-gray-900">{content.description}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-600">ID:</span>{' '}
                <span className="text-gray-900">{content.id}</span>
              </div>
              {renderComplianceSection('HIPAA', content.hipaa)}
              {renderComplianceSection('PCI DSS', content.pci_dss)}
              {renderComplianceSection('GDPR', content.gdpr)}
              {renderComplianceSection('NIST 800-53', content.nist_800_53)}
              {renderComplianceSection('TSC', content.tsc)}
              {renderComplianceSection('GPG13', content.gpg13)}
              {renderMitreSection()}
              {renderComplianceSection('Groups', content.groups)}
            </>
          ) : (
            Object.entries(content).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="text-gray-600">{key}:</span>{' '}
                <span className="text-gray-900">{renderValue(value)}</span>
              </div>
            ))
          )}
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

// Add this to your normalizeLogs.js file