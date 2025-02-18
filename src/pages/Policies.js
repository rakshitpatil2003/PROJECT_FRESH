// Policies.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Policies = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'blue' }}>
            Cyber Security Policy
          </Typography>
          <Typography paragraph>
            The Cyber Security Policy should be distinct from the IT/IS policy of the UCB so that it highlights the risks from cyber threats and the measures to address/reduce these risks. While identifying and assessing the inherent risks, UCBs should keep in view.
          </Typography>
          <Typography paragraph>
            <strong>The technologies adopted:</strong> Security incident event management (SIEM), Privilege Identity Management (PIM), Database activity monitoring.
          </Typography>
          <Typography paragraph>
            <strong>Delivery channels:</strong> ATM, PoS, IMPS, etc.
          </Typography>
          <Typography paragraph>
            <strong>Digital products being offered:</strong> m-Banking, UPI, e-Wallet, etc.
          </Typography>
          <Typography paragraph>
            <strong>Internal and external threats:</strong> Internal threats such as critical & sensitive data compromise, password theft, internal source code review. External threats include DDoS, ransomware, etc.
          </Typography>
          <Typography paragraph>
            <strong>Rate each of these risks:</strong> Low, Medium, High, and Very High.
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 3 }}>
            IT Architecture/Framework should be security compliant
          </Typography>
          <Typography paragraph>
            The IT architecture/framework, including network, server, database, and application, end-user systems, etc., should maintain security measures at all times and be reviewed periodically.
          </Typography>

          {/* Additional Sections */}
          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3 }}>
            Network
          </Typography>
          <Typography paragraph>
            Identify weak areas through VAPT tests, implement cyber crisis management plans, enforce firewall restrictions, and encourage cybersecurity awareness across the organization.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3 }}>
            Server
          </Typography>
          <Typography paragraph>
            Enforce restricted access, ensure internal and external security measures, and separate application servers from internet-accessible servers.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3 }}>
            Database
          </Typography>
          <Typography paragraph>
            Control database access, encrypt passwords, log database activities, and perform regular backups and DR drills.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3 }}>
            Application
          </Typography>
          <Typography paragraph>
            Implement software restrictions, encrypt database links, enforce frequent password changes, and regulate access to external devices.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3 }}>
            End User Systems
          </Typography>
          <Typography paragraph>
            Ensure role-based access controls, conduct cybersecurity reviews annually, and provide ongoing cybersecurity awareness training.
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 3 }}>
            Basic Cyber Security Controls for Urban Cooperative Banks (UCBs)
          </Typography>
          <Typography paragraph>
            1) Maintain an up-to-date IT Asset Inventory.  
            2) Prevent unauthorized software access.  
            3) Implement strong environmental controls.  
            4) Secure network configurations.  
            5) Ensure regular patch management.  
            6) Implement strong user access controls.  
            7) Secure email and messaging systems.  
            8) Restrict removable media access.  
            9) Provide continuous employee cybersecurity training.  
            10) Educate customers about security threats.  
            11) Manage vendor/outsourcing risks effectively.  
          </Typography>

          <Typography paragraph>
            Cybersecurity policies should be reviewed annually, and organizations must ensure that their employees, management, and customers are aware of the latest security measures.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Policies;
