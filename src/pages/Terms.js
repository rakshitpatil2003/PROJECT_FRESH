// Terms.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

const Terms = () => {
  return (
    <Box sx={{ flexGrow: 1, mb: 8 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'blue' }}>
            Terms of Use
          </Typography>
          <Typography paragraph>
            The terms of use that are prescribed down below are the terms of use on which you may access through this website.
            It is recommended for you as a user of this site to read and accept all of these terms and conditions along with Disclaimer.
            Nothing contained herein shall be considered to grant any third party rights or benefits. In any case, if you disagree to bound
            by these terms and conditions as the user of this website, you may opt-out from using this website.
          </Typography>
          <Typography paragraph>
            VGIL reserves the right to modify these terms of use at any time. Without prior notice, it can post the amended Terms of Use
            on this website. Your use of this website is an indication of your acceptance of the amended Terms of Use.
          </Typography>
          <Typography paragraph>
            It is essential for every user to go through the Terms of Use periodically.
          </Typography>
          <Typography paragraph>
            This VGIL website (https://vgipl.com) is an open platform in the form of a medium that has been designed to enable users, visitors,
            including investors, current or potential customers, financial and industry analysts, alliance partners or potential alliance partners,
            media and journalists, current and former employees, job-seekers, and others to collect information about VGIL and to interact with VGIL
            through the contact form given on the website.
          </Typography>
          <Typography paragraph>
            VGIL reserves rights to immediately terminate or remove your access to this website as a user without prior notice or showing any reason.
            It can also do the same for various other reasons if it suspects a breach or violation of these Terms of Use or requests by enforcement
            of law or other government agencies, any unexpected technical problems, or any additional reasons that VGIL finds good enough and believes
            for such removal. It needs to be understood and agreed by users that all terminations shall be made by VGIL at its sole discretion and
            VGIL shall not be liable to you or any third party for the termination of access to this website.
          </Typography>
          <Typography paragraph>
            To maintain the confidentiality of password and account is the user’s responsibility. He/she is/shall be completely responsible for any
            kind of activities that take place under his/her account/password with or without his/her knowledge.
          </Typography>
          <Typography paragraph>
            VGIL does not assure:
          </Typography>
          <ul>
            <li>The site, its contents, or quality will meet user’s needs.</li>
            <li>Uninterrupted access to this website, secure, timely, or effort-free.</li>
            <li>Any material obtained or downloaded from this website is at your own decision and you will be the only one responsible for any damage
                that may occur to your computer or loss of data that results from the download of any such material.</li>
            <li>The information submitted by you strictly relates to you in person only.</li>
          </ul>
        </Paper>
      </Container>
    </Box>
  );
};

export default Terms;
