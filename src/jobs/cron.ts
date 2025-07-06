import cron from 'node-cron';
import Logger from '../utils/logger';
import User from '../models/user.model';
import birthdayService from '../services/birthday.service';

const logger = new Logger('Cron');

/**
 * Example cron job that runs every day at midnight
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
 * Example cron job that runs every hour
 * Schedule: '0 * * * *' (minute hour day-of-month month day-of-week)
 */
export const setupHourlyJob = (): void => {
  if (cron.validate('0 * * * *')) {
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running hourly job');
        // Implement job logic here
        // For example: Check system health, send metrics, etc.
        
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
 * Initialize birthday reminders for all existing users
 */
export const initializeBirthdayReminders = async (): Promise<void> => {
  try {
    logger.info('Initializing birthday reminders for existing users');
    const users = await User.find({ active: true });
    birthdayService.initializeAllReminders(users);
    logger.info(`Birthday reminders initialized for ${users.length} users`);
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
  // setupHourlyJob();
  
  // Set up birthday reminders for existing users
  await initializeBirthdayReminders();
  
  logger.info('All cron jobs initialized');
};

export default {
  initializeCronJobs,
  setupDailyCleanupJob,
  setupHourlyJob,
  initializeBirthdayReminders
};
