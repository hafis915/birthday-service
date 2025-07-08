import User from '../models/user.model';
import { UserDocument } from '../types';
import Logger from '../utils/logger';

// Initialize logger
const logger = new Logger('BirthdayService');

class BirthdayService {
  /**
   * Calculate the next birthday date for a user
   * Properly handles leap years (Feb 29)
   * @param user The user document
   * @returns The next birthday date in user's timezone
   */
  calculateNextBirthday(user: UserDocument): Date | null {
    try {
      if (!user.birthday || !user.timezone) {
        return null;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      
      const birthday = new Date(user.birthday);
      const birthdayMonth = birthday.getMonth(); // 0-11
      const birthdayDay = birthday.getDate();
      
      // Try current year's birthday
      let nextBirthday = new Date(Date.UTC(currentYear, birthdayMonth, birthdayDay, 9, 0, 0));
      
      // Handle February 29 for non-leap years
      if (birthdayMonth === 1 && birthdayDay === 29 && !this.isLeapYear(currentYear)) {
        // Use March 1st instead for non-leap years
        nextBirthday = new Date(Date.UTC(currentYear, 2, 1, 9, 0, 0));
      }
      
      // If birthday already passed this year, use next year
      const nowUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()));
      if (nextBirthday < nowUTC) {
        nextBirthday = new Date(Date.UTC(currentYear + 1, birthdayMonth, birthdayDay, 9, 0, 0));
        
        // Handle February 29 for next year if it's not a leap year
        if (birthdayMonth === 1 && birthdayDay === 29 && !this.isLeapYear(currentYear + 1)) {
          nextBirthday = new Date(Date.UTC(currentYear + 1, 2, 1, 9, 0, 0));
        }
      }
      
      return nextBirthday;
    } catch (error) {
      logger.error(`Error calculating next birthday for user ${user._id}:`, error);
      return null;
    }
  }
  
  /**
   * Check if a year is a leap year
   * @param year The year to check
   * @returns boolean
   */
  isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  /**
   * Schedule a birthday reminder for a user
   * Instead of creating in-memory cron jobs, updates the database with the next reminder date
   * @param user The user document
   * @returns Promise resolving to the updated user document
   */
  async scheduleBirthdayReminder(user: UserDocument): Promise<UserDocument | null> {
    try {
      // Skip if user doesn't have required birthday data
      if (!user.birthday || !user.timezone) {
        logger.warn(`Cannot schedule birthday reminder for user ${user._id}: missing birthday or timezone`);
        return null;
      }
      
      // Calculate next birthday
      const nextBirthday = this.calculateNextBirthday(user);
      if (!nextBirthday) {
        logger.warn(`Failed to calculate next birthday for user ${user._id}`);
        return null;
      }
      
      // Use the user's name or default to a generic identifier
      const userName = user.name || `User ${user._id}`;
      
      logger.info(`Setting next birthday reminder for ${userName} (${user._id}) on ${nextBirthday.toISOString()}`);
      
      // Update user document with next reminder date
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          'birthdayReminder.nextReminder': nextBirthday,
          'birthdayReminder.active': true
        },
        { new: true }
      );
      
      return updatedUser;
    } catch (error) {
      logger.error(`Failed to schedule birthday reminder for user ${user._id}:`, error);
      return null;
    }
  }
  
  /**
   * Deactivate a birthday reminder for a user
   * @param userId The user ID
   * @returns Promise resolving to true if successful, false otherwise
   */
  async cancelBirthdayReminder(userId: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndUpdate(
        userId,
        { 'birthdayReminder.active': false }
      );
      
      if (result) {
        logger.info(`Birthday reminder for user ${userId} deactivated`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Failed to cancel birthday reminder for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Update a user's birthday reminder when their info changes
   * @param user The updated user document
   */
  async updateBirthdayReminder(user: UserDocument): Promise<UserDocument | null> {
    return this.scheduleBirthdayReminder(user);
  }

  /**
   * Process birthday reminders in batches to avoid memory issues
   * @param batchSize Number of users to process per batch
   */
  async processBirthdayReminders(batchSize: number = 100): Promise<number> {
    try {
      logger.info('Processing birthday reminders');
      
      const now = new Date();
      let processedCount = 0;
      let totalNotified = 0;
      let hasMore = true;
      let skip = 0;
      
      // Process users in batches to avoid memory issues
      while (hasMore) {
        // Find users with upcoming birthdays (nextReminder within the next hour)
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        
        const users = await User.find({
          'birthdayReminder.active': true,
          'birthdayReminder.nextReminder': { $lte: nextHour }
        })
        .skip(skip)
        .limit(batchSize);
        
        if (users.length === 0) {
          hasMore = false;
          break;
        }
        
        // Process each user's birthday reminder
        for (const user of users) {
          try {
            const currentYear = now.getFullYear();
            const userName = user.name || `User ${user._id}`;
            
            // Check if we've already processed this user's birthday this year
            if (user.birthdayReminder?.lastProcessedYear === currentYear) {
              // Already processed this year, just update the next reminder for next year
              await this.scheduleBirthdayReminder(user);
              continue;
            }
            
            // Send the reminder
            logger.info(`🎉 Happy Birthday to ${userName}! 🎂`);
            
            // Here you would implement the actual notification logic:
            // - Send an email
            // - Send a push notification
            // - Call an external notification service
            // etc.
            
            // Update the user record to mark this year's birthday as processed
            await User.findByIdAndUpdate(user._id, {
              'birthdayReminder.lastProcessedYear': currentYear,
            });
            
            // Schedule next year's reminder
            await this.scheduleBirthdayReminder(user);
            
            totalNotified++;
          } catch (error) {
            logger.error(`Error processing birthday reminder for user ${user._id}:`, error);
          }
        }
        
        processedCount += users.length;
        skip += batchSize;
        
        // Stop if we processed less than a batch (indicates we've reached the end)
        if (users.length < batchSize) {
          hasMore = false;
        }
      }
      
      logger.info(`Birthday reminder processing complete. Processed ${processedCount} users, sent ${totalNotified} notifications`);
      return totalNotified;
    } catch (error) {
      logger.error('Error processing birthday reminders:', error);
      return 0;
    }
  }
  
  /**
   * Check for missed birthday reminders (e.g., after server downtime)
   * @param lookbackHours Number of hours to look back for missed reminders
   * @param batchSize Number of users to process per batch
   */
  async processMissedReminders(lookbackHours: number = 24, batchSize: number = 100): Promise<number> {
    try {
      logger.info(`Processing missed birthday reminders from the last ${lookbackHours} hours`);
      
      const now = new Date();
      const lookbackTime = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
      const currentYear = now.getFullYear();
      
      let processedCount = 0;
      let totalNotified = 0;
      let hasMore = true;
      let skip = 0;
      
      // Process in batches
      while (hasMore) {
        // Find users with missed birthdays
        const users = await User.find({
          'birthdayReminder.active': true,
          'birthdayReminder.nextReminder': { $gte: lookbackTime, $lte: now },
          'birthdayReminder.lastProcessedYear': { $ne: currentYear }
        })
        .skip(skip)
        .limit(batchSize);
        
        if (users.length === 0) {
          hasMore = false;
          break;
        }
        
        // Process each missed reminder
        for (const user of users) {
          try {
            const userName = user.name || `User ${user._id}`;
            
            // Send the reminder
            logger.info(`🎉 Belated Happy Birthday to ${userName}! 🎂 (Missed during downtime)`);
            
            // Here you would implement the actual notification logic
            
            // Update the user record
            await User.findByIdAndUpdate(user._id, {
              'birthdayReminder.lastProcessedYear': currentYear,
            });
            
            // Schedule next year's reminder
            await this.scheduleBirthdayReminder(user);
            
            totalNotified++;
          } catch (error) {
            logger.error(`Error processing missed reminder for user ${user._id}:`, error);
          }
        }
        
        processedCount += users.length;
        skip += batchSize;
        
        // Stop if we processed less than a batch
        if (users.length < batchSize) {
          hasMore = false;
        }
      }
      
      logger.info(`Missed reminder processing complete. Processed ${processedCount} users, sent ${totalNotified} notifications`);
      return totalNotified;
    } catch (error) {
      logger.error('Error processing missed reminders:', error);
      return 0;
    }
  }
  
  /**
   * Initialize birthday reminders for users who don't have them set up yet
   * Uses batching to avoid memory issues with large user bases
   * @param batchSize Number of users to process per batch
   */
  async initializeAllReminders(batchSize: number = 100): Promise<number> {
    try {
      logger.info('Initializing birthday reminders');
      
      let processedCount = 0;
      let hasMore = true;
      let skip = 0;
      
      // Process users in batches
      while (hasMore) {
        // Find users who need reminder initialization
        const users = await User.find({
          $or: [
            { 'birthdayReminder.nextReminder': null },
            { 'birthdayReminder.nextReminder': { $exists: false } }
          ]
        })
        .skip(skip)
        .limit(batchSize);
        
        if (users.length === 0) {
          hasMore = false;
          break;
        }
        
        // Process each user
        for (const user of users) {
          try {
            await this.scheduleBirthdayReminder(user);
          } catch (error) {
            logger.error(`Error initializing reminder for user ${user._id}:`, error);
          }
        }
        
        processedCount += users.length;
        skip += batchSize;
        
        // Stop if we processed less than a batch
        if (users.length < batchSize) {
          hasMore = false;
        }
      }
      
      logger.info(`Birthday reminder initialization complete. Processed ${processedCount} users`);
      return processedCount;
    } catch (error) {
      logger.error('Error initializing birthday reminders:', error);
      return 0;
    }
  }
}

export default new BirthdayService();
