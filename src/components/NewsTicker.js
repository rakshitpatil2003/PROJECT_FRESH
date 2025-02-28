// src/components/NewsTicker.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography } from '@mui/material';

const NewsTicker = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get('http://192.168.1.151:5000/api/news');
        setNews(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to fetch news headlines');
        setLoading(false);
      }
    };

    fetchNews();
  }, []);
  
  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: theme => theme.palette.mode === 'dark' ? '#FF0000' : '#FF0000',
        color: '#ffffff', // WHITE text for both themes for better contrast
        py: 1.5,  // More padding for prominence
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: theme => theme.palette.mode === 'dark' ? '#D3D3D3' : '#D3D3D3', // Accent border
        overflow: 'hidden',
        position: 'fixed',
        bottom: '75px', // Position above footer
        left: 0,
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' // Subtle shadow for depth
      }}
    >
      {loading ? (
        <Typography variant="body1" sx={{ px: 3, fontWeight: 'medium' }}>Loading latest security news...</Typography>
      ) : error ? (
        <Typography variant="body1" sx={{ px: 3, fontWeight: 'medium' }}>Unable to load security news headlines</Typography>
      ) : (
        <Box
          sx={{
            whiteSpace: 'nowrap',
            height: '3px',
            animation: 'ticker 100s linear infinite',
            display: 'inline-block',
            paddingLeft: '100%',
            '@keyframes ticker': {
              '0%': {
                transform: 'translateX(0%)'
              },
              '100%': {
                transform: 'translateX(-100%)'
              }
            }
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontWeight: 'medium',
              '& .ticker-separator': {
                display: 'inline-block',
                width: '60px', // Wide spacing between headlines
                textAlign: 'center'
              }
            }}
          >
            {news.map((headline, index) => (
              <React.Fragment key={index}>
                <span>{headline}</span>
                {index < news.length - 1 && (
                  <span className="ticker-separator">•</span>
                )}
              </React.Fragment>
            ))}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default NewsTicker;