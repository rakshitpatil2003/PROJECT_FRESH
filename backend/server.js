// backend/server.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const compression = require('compression');
const { fetchLogsFromGraylog } = require('./controllers/graylogController');
const cleanupOldLogs = require('./utils/cleanupLogs');
const removeDuplicateLogs = require('./utils/dedupLogs');
const ensureIndexes = require('./utils/ensureIndexes');
const maintainTimeBasedCollections = require('./utils/maintainCollections');
const initDatabase = require('./utils/initDatabase');
const ticketsRouter = require('./routes/tickets');

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Limit the number of workers to prevent excessive processes
  const optimalWorkers = Math.min(numCPUs, 4); // Limit to max 4 workers
  console.log(`Starting ${optimalWorkers} workers...`);

  // Initialize master process
  const initializeMaster = async () => {
    try {
      require('dotenv').config();
      const connectDB = require('./config/db');

      // Connect to MongoDB
      await connectDB();
      console.log('Master process connected to MongoDB');

      // Initialize database with admin user and collections
      try {
        await initDatabase();
        console.log('Database initialization completed.');
      } catch (error) {
        console.error('Database initialization error:', error);
      }

      // Run index initialization
      console.log('Running database schema initialization...');
      await ensureIndexes();
      console.log('Database schema initialized');

      // Schedule log fetching every 10 seconds
      setInterval(fetchLogsFromGraylog, 10000);
      console.log('Log fetching scheduled in master process');

      // Run initial deduplication
      try {
        console.log('Running initial deduplication...');
        await removeDuplicateLogs();
        console.log('Initial deduplication completed');
      } catch (error) {
        console.error('Error running deduplication:', error);
      }

      // Schedule periodic deduplication (e.g., every hour)
      setInterval(async () => {
        try {
          console.log('Running scheduled deduplication...');
          await removeDuplicateLogs();
        } catch (error) {
          console.error('Error in scheduled deduplication:', error);
        }
      }, 60000); // Every 1 minute

      // Run initial maintenance
      try {
        await maintainTimeBasedCollections();
        console.log('Initial maintenance completed');
      } catch (error) {
        console.error('Error running maintenance:', error.message);
      }

      // Schedule maintenance to run daily at 2 AM
      setInterval(async () => {
        try {
          const now = new Date();
          if (now.getHours() === 2 && now.getMinutes() === 0) {
            console.log('Running scheduled collection maintenance...');
            await maintainTimeBasedCollections();
          }
        } catch (error) {
          console.error('Error running scheduled maintenance:', error);
        }
      }, 60000); // Check every minute

    } catch (error) {
      console.error('Failed to initialize master process:', error);
      process.exit(1);
    }
  };

  // Start master process initialization
  initializeMaster();

  // Keep track of active workers
  const workers = new Set();

  // Fork workers
  for (let i = 0; i < optimalWorkers; i++) {
    const worker = cluster.fork();
    workers.add(worker);
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log(`Exit code: ${code}`);
    console.log(`Signal: ${signal}`);
    workers.delete(worker);

    // Replace dead worker if not shutting down
    if (signal !== 'SIGTERM') {
      const newWorker = cluster.fork();
      workers.add(newWorker);
      console.log(`Started new worker ${newWorker.process.pid}`);
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Master received SIGTERM. Shutting down gracefully...');

    // Stop accepting new connections
    for (const worker of workers) {
      worker.send('shutdown');
    }

    // Wait for workers to finish
    setTimeout(() => {
      console.log('Forcing shutdown...');
      process.exit(1);
    }, 30000); // Force shutdown after 30 seconds
  });

} else {
  // Worker process
  require('dotenv').config();
  const express = require('express');
  const cors = require('cors');
  const connectDB = require('./config/db');
  const logsRoutes = require('./routes/Logs');
  const authRoutes = require('./routes/auth');
  const newsticker = require('./routes/news');

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
          'http://192.168.1.67:3000',
          'http://192.168.1.71:3000',
          'http://192.168.1.67:5000',
          'http://192.168.1.71:5000',
          'http://192.168.1.151:3000',
          'http://192.168.1.151:5000',
          'http://192.168.1.64:3000',
          'http://192.168.1.64:5000',
          'http://192.168.77.78:3000',
          'http://192.168.77.78:5000',
          'http://103.76.143.84:3000',
          'http://103.76.143.84:5000',
          'https://192.168.1.70:3443',
          'http://115.245.81.14:3000',
          'http://115.245.81.14:5000',
          'https://115.245.81.14:3443',
          'https://192.168.1.165:6379'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'X-Requested-With', 'Origin'],
        exposedHeaders: ['Authorization']
      };

      // Middleware
      app.use(cors(corsOptions));
      app.use(express.json());
      app.use(compression());

      app.options('*', cors(corsOptions));

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

      app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(err.status || 500).json({
          message: err.message || 'Internal Server Error',
          error: process.env.NODE_ENV === 'development' ? err : {}
        });
      });

      // Add headers middleware to ensure CORS headers are always set
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        next();
      });

      // Routes
      app.use('/api/auth', authRoutes);
      app.use('/api/logs', logsRoutes);
      app.use('/api/news', newsticker);
      app.use('/api/tickets', ticketsRouter);

      // Test endpoint
      app.get('/api/test', (req, res) => {
        res.json({
          message: 'API is working',
          worker: process.pid,
          server: '192.168.1.67',
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

  // Handle graceful shutdown message from master
  process.on('message', async (msg) => {
    if (msg === 'shutdown') {
      console.log(`Worker ${process.pid} shutting down...`);
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    }
  });

  // Initialize worker
  initializeWorker();
}