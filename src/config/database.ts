import mongoose from 'mongoose';
import Logger from '../utils/logger';

// Initialize logger
const logger = new Logger('Database');

// MongoDB connection URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/be-test';

/**
 * Connect to MongoDB database
 */
export const connectDB = async (): Promise<void> => {
  try {
    logger.info(`Attempting to connect to MongoDB at ${MONGODB_URI}`);
    
    // Add connection options to avoid deprecation warnings
    await mongoose.connect(MONGODB_URI);
    
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    logger.info('Make sure MongoDB is running on your system');
    process.exit(1); // Exit with failure
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => console.log('MongoDB connection established'));
mongoose.connection.on('disconnected', () => console.log('MongoDB connection disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));

// Handle application termination
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

export default { connectDB, disconnectDB };
