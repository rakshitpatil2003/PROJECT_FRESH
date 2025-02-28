// backend/controllers/newsController.js
const axios = require('axios');
const cheerio = require('cheerio');

exports.fetchNews = async (req, res) => {
  try {
    console.log('Fetching news from Cyware...');
    
    // First, let's test with static data to ensure the route works
    // res.json(['Test headline 1', 'Test headline 2']);
    
    // Now let's try to fetch the actual data
    const response = await axios.get('https://social.cyware.com/cyber-security-news-articles', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const headlines = [];
    
    // Debug output to see what we're getting
    console.log('Response received, parsing headlines...');
    
    // Try different selectors based on the page structure
    $('.cy-0-2-1 .card-title, .cy-card__title, .card-title, h1, h2, h3').each((i, element) => {
      const headline = $(element).text().trim();
      if (headline) {
        console.log('Found headline:', headline);
        headlines.push(headline);
      }
    });
    
    console.log(`Found ${headlines.length} headlines`);
    
    if (headlines.length === 0) {
      // If no headlines found with selectors, return a message
      console.log('No headlines found, returning sample data');
      res.json(['Sample Headline 1: Cyber Attack Reported', 'Sample Headline 2: Security Advisory', 'Sample Headline 3: New Vulnerability Discovered']);
    } else {
      res.json(headlines);
    }
  } catch (error) {
    console.error('Error fetching news:', error.message);
    // Return some sample data in case of error
    res.json(['Error fetching headlines - Sample 1', 'Error fetching headlines - Sample 2']);
  }
};