// Privacy.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Privacy = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'blue' }}>
            Privacy Statement
          </Typography>
          <Typography paragraph>
            We at Virtual Galaxy Infotech Private Limited are committed to safeguarding your privacy. This Privacy Policy explains how we may collect,
            use, share, and keep personal information about you. It also explains the choices on your part related to the use of, your access to,
            and possibilities and ways to correct your personal information. It is crucial on your part to read the Privacy Policy carefully.
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Required Personal Information</Typography>
          <Typography paragraph>
            For the purpose of this Privacy Policy, we collect personal information of individuals which includes name, email address, contact details,
            or location. We gather pieces of information that you provide us when you select to contact us for more information or when you register on our website.
            We collect time, date, and a few additional information about the user’s browser and system, referring/exit pages, files viewed on our site (like graphics,
            downloads, etc.), and IP address for all the visitors to our site. We use this information for site personalization purposes.
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Use of Personal Information</Typography>
          <Typography paragraph>
            Personal Information may be used by us to:
          </Typography>
          <ul>
            <li>Manage and provide our services</li>
            <li>Comprehend our visitors/users and improve how our website works</li>
            <li>Get in touch with you and reply to your queries</li>
            <li>Provide the related information about our products and services to you</li>
            <li>Keep the employees, users, system, and services safe</li>
            <li>Provide additional information or support</li>
          </ul>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>When/How We Share Your Personal Information?</Typography>
          <Typography paragraph>
            Your personal information may be disclosed to third parties like members of VGIL branches or vendors that work on our behalf. They are authorized to use
            your personal information when it is essential to provide the following services to us:
          </Typography>
          <ul>
            <li>Providing customer service</li>
            <li>Sending marketing communications</li>
            <li>Conducting research and analysis</li>
            <li>Payment processing</li>
            <li>Providing cloud computing infrastructure</li>
          </ul>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Legal Disclaimer</Typography>
          <Typography paragraph>
            In a few cases, VGIL may be required to disclose your personal data to meet security requirements, lawful requests raised by public authorities,
            as well as instances requiring cooperation with law enforcement agencies where mandated by law.
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>How Long Do We Keep Your Personal Information?</Typography>
          <Typography paragraph>
            Personal Information is held as long as the purpose for its collection survives or is lawfully further processed. The conditions used to determine the
            duration to hold personal information may include:
          </Typography>
          <ul>
            <li>Type of personal information provided to us</li>
            <li>The purpose for which the personal information is provided</li>
            <li>To continue with essential business and operational requirements by providing you the services or the functionality requested by you</li>
          </ul>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Where We Store Personal Information?</Typography>
          <Typography paragraph>
            We collect, store, and process information on servers. We take effective measures to ensure that your personal data which is collected by us is continuously
            protected through adequate safeguards.
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Updating Privacy Policy</Typography>
          <Typography paragraph>
            At any given time, VGIL reserves the right to revise this Privacy Policy and Terms of Use, add or amend website information, add new product and service features,
            add new items on the website, or even terminate the website without prior notice.
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Copyright Notice</Typography>
          <Typography paragraph>
            The text, data, video clips, and photographs, and all of the other pieces of information available on this site are protected under copyright.
            The content on this site may not be copied and republished or used for the creation of any derivative works without the prior consent from VGIL.
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Cookies Used</Typography>
          <Typography paragraph>
            We use cookies to analyze trends, track user movement around the site, manage the site, and collect demographic information about the user.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Privacy;
