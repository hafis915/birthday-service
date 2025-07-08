import cron from 'node-cron';
import Logger from '../utils/logger';
import User from '../models/user.model';
import birthdayService from '../services/birthday.service';

const logger = new Logger('Cron');

/**
 * Cron job that runs every day at midnight
 * Schedule: '0 0 * * *' (minute hour day-of-month month day-of-week)
 */
export const setupDailyCleanupJob = (): void => {
  // Check if cron schedule is valid
  if (cron.validate('0 0 * * *')) {
    cron.schedule('0 0 * * *', async () => {
      try {
        logger.info('Running daily cleanup job');
        // Implement job logic here
        // For example: Delete old logs, temporary data, etc.
        
        logger.info('Daily cleanup job completed');
      } catch (error) {
        logger.error('Error in daily cleanup job:', error);
      }
    });
    
    logger.info('Daily cleanup job scheduled');
  } else {
    logger.error('Invalid cron schedule for daily cleanup job');
  }
};

/**
 * Cron job that runs every hour to process birthday reminders
 * Schedule: '0 * * * *' (minute hour day-of-month month day-of-week)
 */
export const setupHourlyJob = (): void => {
  if (cron.validate('0 * * * *')) {
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running hourly job');
        
        // Process birthday reminders that are due in the next hour
        await birthdayService.processBirthdayReminders();
        
        logger.info('Hourly job completed');
      } catch (error) {
        logger.error('Error in hourly job:', error);
      }
    });
    
    logger.info('Hourly job scheduled');
  } else {
    logger.error('Invalid cron schedule for hourly job');
  }
};

/**
 * Cron job that runs after application startup to catch any reminders missed during downtime
 */
export const setupMissedRemindersJob = (): void => {
  // Process missed reminders once on startup with a slight delay
  // to allow the application to fully initialize
  setTimeout(async () => {
    try {
      logger.info('Running missed reminders check');
      
      // Look back 24 hours for any missed reminders
      await birthdayService.processMissedReminders(24);
      
      logger.info('Missed reminders check completed');
    } catch (error) {
      logger.error('Error checking missed reminders:', error);
    }
  }, 5000); // Wait 5 seconds after initialization
};

/**
 * Initialize birthday reminders for all existing users
 */
export const initializeBirthdayReminders = async (): Promise<void> => {
  try {
    logger.info('Initializing birthday reminders for existing users');
    
    // Instead of loading all users at once, use the batch processing in the service
    const processedCount = await birthdayService.initializeAllReminders(100);
    
    logger.info(`Birthday reminders initialized for ${processedCount} users`);
  } catch (error) {
    logger.error('Failed to initialize birthday reminders:', error);
  }
};

/**
 * Initialize and set up all cron jobs
 */
export const initializeCronJobs = async (): Promise<void> => {
  logger.info('Initializing cron jobs');
  
  // Set up regular maintenance jobs
  setupDailyCleanupJob();
  
  // Set up hourly job to process birthday reminders
  setupHourlyJob();
  
  // Setup missed reminders check (runs once on startup)
  setupMissedRemindersJob();
  
  // Set up birthday reminders for existing users
  await initializeBirthdayReminders();
  
  logger.info('All cron jobs initialized');
};

export default {
  initializeCronJobs,
  setupDailyCleanupJob,
  setupHourlyJob,
  setupMissedRemindersJob,
  initializeBirthdayReminders
};
