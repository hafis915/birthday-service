import mongoose from 'mongoose';
import User from '../models/user.model';
import Logger from '../utils/logger';
import config from '../config/database';

const logger = new Logger('BirthdayMigration');

/**
 * Migration script to add birthdayReminder field to existing user documents
 * This will:
 * 1. Connect to the database
 * 2. Find all users without a birthdayReminder field
 * 3. Update them with the default birthdayReminder structure
 * 4. Log the results
 */
async function migrateBirthdayReminders() {
  try {
    // Connect to the database
    logger.info('Connecting to database...');
    await config.connectDB();
    logger.info('Connected to database');

    // Count total users
    const totalUsers = await User.countDocuments();
    logger.info(`Found ${totalUsers} total users in the database`);

    // Find users without birthdayReminder field
    const usersWithoutReminder = await User.find({
      $or: [
        { birthdayReminder: { $exists: false } },
        { birthdayReminder: null }
      ]
    });

    if (usersWithoutReminder.length === 0) {
      logger.info('No users need migration. All users already have birthdayReminder field.');
      await config.disconnectDB();
      return;
    }

    logger.info(`Found ${usersWithoutReminder.length} users without birthdayReminder field. Starting migration...`);

    // Update users in batches to avoid memory issues
    const batchSize = 100;
    let processedCount = 0;
    let currentBatch = [];

    for (let i = 0; i < usersWithoutReminder.length; i++) {
      currentBatch.push(usersWithoutReminder[i]._id);
      
      // Process when batch is full or this is the last item
      if (currentBatch.length >= batchSize || i === usersWithoutReminder.length - 1) {
        logger.info(`Processing batch of ${currentBatch.length} users...`);
        
        // Update all users in the current batch
        const result = await User.updateMany(
          { _id: { $in: currentBatch } },
          {
            $set: {
              'birthdayReminder': {
                lastProcessedYear: null,
                nextReminder: null,
                active: true
              }
            }
          }
        );
        
        processedCount += result.modifiedCount;
        logger.info(`Batch complete. ${result.modifiedCount} users updated.`);
        
        // Reset batch
        currentBatch = [];
      }
    }

    logger.info(`Migration complete. ${processedCount} users updated with birthdayReminder field.`);
    
    // Disconnect from the database
    await config.disconnectDB();
    logger.info('Disconnected from database');
    
  } catch (error: unknown) {
    logger.error('Error during birthday reminder migration:', error instanceof Error ? error : String(error));
    
    // Ensure we disconnect even on error
    try {
      await config.disconnectDB();
      logger.info('Disconnected from database after error');
    } catch (disconnectError: unknown) {
      logger.error('Error disconnecting from database:', disconnectError instanceof Error ? disconnectError : String(disconnectError));
    }
    
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateBirthdayReminders()
    .then(() => {
      logger.info('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error: unknown) => {
      logger.error('Migration script failed:', error instanceof Error ? error : String(error));
      process.exit(1);
    });
}

export default migrateBirthdayReminders;
