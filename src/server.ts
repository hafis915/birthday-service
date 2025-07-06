import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/database';
import Logger from './utils/logger';
import { initializeCronJobs } from './jobs/cron';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = new Logger('Server');

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

console.log('Starting server...');

// Start server
const server = app.listen(PORT, async () => {
  logger.info('Server callback triggered');
  
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await connectDB();
    logger.info('Database connected successfully');
    
    // Initialize cron jobs
    logger.info('Initializing cron jobs...');
    await initializeCronJobs();
    logger.info('Cron jobs initialized successfully');
    
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    logger.info(`API is available at http://localhost:${PORT}/api`);
  } catch (error) {
    logger.error('Error in server startup:', error);
    // Don't exit process here, let the error handlers deal with it
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});
