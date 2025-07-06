import * as cron from 'node-cron';
import { UserDocument } from '../types';
import Logger from '../utils/logger';

// Initialize logger
const logger = new Logger('BirthdayService');

class BirthdayService {
  private birthdayJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Schedule a birthday reminder for a user at 9 AM in their local timezone
   * @param user The user document
   */
  scheduleBirthdayReminder(user: UserDocument): void {
    try {
      // Skip if user doesn't have required birthday data
      if (!user.birthday || !user.timezone) {
        logger.warn(`Cannot schedule birthday reminder for user ${user._id}: missing birthday or timezone`);
        return;
      }
      
      // Use the user's name or default to a generic identifier
      const userName = user.name || `User ${user._id}`;
      
      // Cancel existing job if it exists
      this.cancelBirthdayReminder(user._id.toString());
      
      // Get user's birthday month and day
      const birthday = new Date(user.birthday);
      const birthdayMonth = birthday.getMonth() + 1; // getMonth() returns 0-11
      const birthdayDay = birthday.getDate();
      
      // Create cron expression for 9 AM in their timezone on their birthday
      // Format: minute hour day month day-of-week
      const cronExpression = `0 9 ${birthdayDay} ${birthdayMonth} *`;
      
      logger.info(`Scheduling birthday reminder for user ${userName} (${user._id}) at 9 AM on ${birthdayMonth}/${birthdayDay} in ${user.timezone} timezone`);
      
      // Schedule the cron job with the user's timezone
      const job = cron.schedule(cronExpression, 
        () => {
          logger.info(`🎉 Happy Birthday to ${userName}! 🎂`);
          // Here you could implement additional actions like sending an email
        }, 
        {
          timezone: user.timezone
        }
      );
      
      // Store the job by user ID
      this.birthdayJobs.set(user._id.toString(), job);
    } catch (error) {
      logger.error(`Failed to schedule birthday reminder for user ${user._id}:`, error);
    }
  }
  
  /**
   * Cancel a scheduled birthday reminder
   * @param userId The user ID
   */
  cancelBirthdayReminder(userId: string): void {
    const existingJob = this.birthdayJobs.get(userId);
    if (existingJob) {
      existingJob.stop();
      this.birthdayJobs.delete(userId);
      logger.info(`Birthday reminder for user ${userId} canceled`);
    }
  }
  
  /**
   * Update a birthday reminder when user info changes
   * @param user The updated user document
   */
  updateBirthdayReminder(user: UserDocument): void {
    this.scheduleBirthdayReminder(user);
  }

  /**
   * Initialize birthday reminders for all existing users
   * @param users Array of user documents
   */
  initializeAllReminders(users: UserDocument[]): void {
    logger.info(`Initializing birthday reminders for ${users.length} users`);
    
    for (const user of users) {
      this.scheduleBirthdayReminder(user);
    }
    
    logger.info('All birthday reminders initialized');
  }
}

export default new BirthdayService();
