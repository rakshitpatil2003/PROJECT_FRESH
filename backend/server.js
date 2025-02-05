const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  require('dotenv').config();
  const express = require('express');
  const cors = require('cors');
  const connectDB = require('./config/db');
  const logsRoutes = require('./routes/Logs');
  const authRoutes = require('./routes/auth'); // Add this line

  const app = express();

  // Connect to MongoDB
  connectDB();

  // Configure CORS for all machines in the network
  const corsOptions = {
    origin: [
      'http://localhost:3000',
      'http://192.168.1.95:3000',  // Your Windows machine
      'http://192.168.1.71:3000',  // Your Linux server
      'http://192.168.1.95:5000',
      'http://192.168.1.71:5000',
      'http://192.168.1.176:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization']
  };

  // Middleware
  app.use(cors(corsOptions));
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log('Request:', {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      ip: req.ip
    });
    next();
  });

  // Routes
  app.use('/api/auth', authRoutes); // Add this line
  app.use('/api/logs', logsRoutes);

  // Test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'API is working',
      server: '192.168.1.95',
      mongodb: '192.168.1.71'
    });
  });

  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    console.log(`Worker ${process.pid} started`);
    console.log(`Server running on ${HOST}:${PORT}`);
    console.log('MongoDB server:', process.env.MONGO_URI);
  });
}