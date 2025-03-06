// Helper functions for MITRE data processing

export const normalizeMitreData = (mitre = {}) => {
    return {
        id: Array.isArray(mitre.id) ? mitre.id : [mitre.id].filter(Boolean),
        tactic: Array.isArray(mitre.tactic) ? mitre.tactic : [mitre.tactic].filter(Boolean),
        technique: Array.isArray(mitre.technique) ? mitre.technique : [mitre.technique].filter(Boolean)
    };
};

export const extractMitreData = (log) => {
    if (!log?.rule?.mitre) {
        return null;
    }

    return normalizeMitreData(log.rule.mitre);
};

export const processMitreLogs = (logs = []) => {
    const safeLogs = Array.isArray(logs) ? logs : [];
    
    // Filter logs with valid MITRE data
    const mitreEntries = safeLogs.filter(log => 
        log?.rule?.mitre && 
        (log.rule.mitre.technique?.length || log.rule.mitre.tactic?.length)
    );

    const processedData = {
        totalMitreAlerts: mitreEntries.length,
        byAgent: {},
        tactics: {},
        techniques: {},
        detailedEntries: []
    };

    mitreEntries.forEach(log => {
        if (!log?.rule?.mitre) return;

        // Store the full log for detailed view
        processedData.detailedEntries.push(log);
        
        const agentName = log.agent?.name || 'Unknown Agent';
        const mitre = log.rule.mitre;
        
        // Process tactics
        const tactics = Array.isArray(mitre.tactic)
            ? mitre.tactic.filter(Boolean)
            : mitre.tactic ? [mitre.tactic] : [];
            
        tactics.forEach(tactic => {
            if (!tactic) return;
            if (!processedData.tactics[tactic]) {
                processedData.tactics[tactic] = 0;
            }
            processedData.tactics[tactic]++;
        });
        
        // Process techniques
        const techniques = Array.isArray(mitre.technique)
            ? mitre.technique.filter(Boolean)
            : mitre.technique ? [mitre.technique] : [];
            
        techniques.forEach(technique => {
            if (!technique) return;
            if (!processedData.techniques[technique]) {
                processedData.techniques[technique] = 0;
            }
            processedData.techniques[technique]++;
        });

        // Track agent-specific data
        if (!processedData.byAgent[agentName]) {
            processedData.byAgent[agentName] = {
                count: 0,
                techniques: [],
                tactics: [],
                logs: []
            };
        }

        processedData.byAgent[agentName].count++;
        processedData.byAgent[agentName].logs.push(log);

        // Process tactics
        mitreData.tactic.forEach(tactic => {
            if (tactic) {
                processedData.tactics[tactic] = (processedData.tactics[tactic] || 0) + 1;
                processedData.byAgent[agentName].tactics[tactic] = 
                    (processedData.byAgent[agentName].tactics[tactic] || 0) + 1;
            }
        });

        // Process techniques
        mitreData.technique.forEach(technique => {
            if (technique) {
                processedData.techniques[technique] = (processedData.techniques[technique] || 0) + 1;
                processedData.byAgent[agentName].techniques[technique] = 
                    (processedData.byAgent[agentName].techniques[technique] || 0) + 1;
            }
        });

        processedData.detailedEntries.push(log);
    });

    // Convert data to arrays and sort
    processedData.agentNames = Array.from(processedData.agentNames);
    processedData.tacticsList = Object.entries(processedData.tactics)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    processedData.techniquesList = Object.entries(processedData.techniques)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    // Process agent-specific metrics
    mitreEntries.forEach(log => {
        if (!log?.rule?.mitre) return;
        const agentName = log.agent?.name || 'Unknown Agent';
        const mitre = log.rule.mitre;
        
        // Get tactics and techniques
        const tactics = Array.isArray(mitre.tactic)
            ? mitre.tactic.filter(Boolean)
            : mitre.tactic ? [mitre.tactic] : [];
            
        const techniques = Array.isArray(mitre.technique)
            ? mitre.technique.filter(Boolean)
            : mitre.technique ? [mitre.technique] : [];
            
        // Initialize agent data if needed
        if (!processedData.byAgent[agentName]) {
            processedData.byAgent[agentName] = {
                count: 0,
                tactics: [],
                techniques: [],
                logs: []
            };
        }
        
        // Update agent's tactics and techniques
        const agentData = processedData.byAgent[agentName];
        tactics.forEach(tactic => {
            if (tactic && !agentData.tactics.includes(tactic)) {
                agentData.tactics.push(tactic);
            }
        });
        
        techniques.forEach(technique => {
            if (technique && !agentData.techniques.includes(technique)) {
                agentData.techniques.push(technique);
            }
        });
        
        // Update counts
        agentData.count++;
        agentData.logs.push(log);
    });
    
    // Update total alerts count
    processedData.totalMitreAlerts = processedData.detailedEntries.length;
    
    // Sort and limit techniques for performance
    const sortedTechniques = Object.entries(processedData.techniques)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    processedData.techniques = Object.fromEntries(sortedTechniques);

    return processedData;
};