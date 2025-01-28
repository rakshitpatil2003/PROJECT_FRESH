// Create src/config.js
const config = {
    API_URL: process.env.NODE_ENV === 'production' 
      ? 'http://192.168.1.71:5000'
      : 'http://localhost:5000'
  };
  
  export default config;