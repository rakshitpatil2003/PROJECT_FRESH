const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const { fetchLogsFromGraylog } = require('./controllers/graylogController');

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Only fetch logs in the master process
  require('dotenv').config();
  const connectDB = require('./config/db');
  
  // Initialize master process database connection and log fetching
  const initializeMaster = async () => {
    try {
      await connectDB();
      console.log('Master process connected to MongoDB');
      
      // Start fetching logs every 10 seconds in master process only
      setInterval(fetchLogsFromGraylog, 10000);
      console.log('Log fetching scheduled in master process');
    } catch (error) {
      console.error('Failed to initialize master process:', error);
      process.exit(1);
    }
  };

  // Start master process initialization
  initializeMaster();

  // Fork worker processes
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log(`Exit code: ${code}`);
    console.log(`Signal: ${signal}`);
    cluster.fork();
  });
} else {
  require('dotenv').config();
  const express = require('express');
  const cors = require('cors');
  const connectDB = require('./config/db');
  const Log = require('./models/Log');
  const logsRoutes = require('./routes/Logs');
  const authRoutes = require('./routes/auth');

  const app = express();

  // Initialize worker process
  const initializeWorker = async () => {
    try {
      await connectDB();
      console.log(`Worker ${process.pid} connected to MongoDB`);

      // Configure CORS
      const corsOptions = {
        origin: [
          'http://localhost:3000',
          'http://192.168.1.95:3000',
          'http://192.168.1.71:3000',
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
        console.log(`Worker ${process.pid} handling request:`, {
          method: req.method,
          url: req.url,
          origin: req.headers.origin,
          ip: req.ip
        });
        next();
      });

      // Routes
      app.use('/api/auth', authRoutes);
      app.use('/api/logs', logsRoutes);

      // Test endpoint
      app.get('/api/test', (req, res) => {
        res.json({ 
          message: 'API is working',
          worker: process.pid,
          server: '192.168.1.95',
          mongodb: '192.168.1.71'
        });
      });

      // Start server
      const PORT = process.env.PORT || 5000;
      const HOST = process.env.HOST || '0.0.0.0';

      app.listen(PORT, HOST, () => {
        console.log(`Worker ${process.pid} listening on ${HOST}:${PORT}`);
      });

    } catch (error) {
      console.error(`Worker ${process.pid} failed to initialize:`, error);
      process.exit(1);
    }
  };

  // Initialize worker
  initializeWorker();
}