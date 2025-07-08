import mongoose from 'mongoose';
import migrateBirthdayReminders from '../../src/scripts/migrate-birthday-reminders';
import User from '../../src/models/user.model';
import Logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('mongoose');
jest.mock('../../src/models/user.model');
jest.mock('../../src/utils/logger');
jest.mock('../../src/config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  disconnectDB: jest.fn().mockResolvedValue(undefined)
}));

describe('Birthday Reminder Migration Script', () => {
  // Mock logger
  const mockLoggerInfo = jest.fn();
  const mockLoggerError = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup logger mock
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => ({
      info: mockLoggerInfo,
      error: mockLoggerError,
      warn: jest.fn()
    } as any));
    
    // Reset database config mocks
    const dbConfig = require('../../src/config/database');
    dbConfig.connectDB.mockReset();
    dbConfig.disconnectDB.mockReset();
    dbConfig.connectDB.mockResolvedValue(undefined);
    dbConfig.disconnectDB.mockResolvedValue(undefined);
  });

  it('should migrate users without birthdayReminder field', async () => {
    // Mock User.countDocuments to return total users
    (User.countDocuments as jest.Mock).mockResolvedValue(150);
    
    // Mock User.find to return users without birthdayReminder
    (User.find as jest.Mock).mockResolvedValue([
      { _id: 'user1' },
      { _id: 'user2' },
      { _id: 'user3' }
    ]);
    
    // Mock User.updateMany to return success
    (User.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });
    
    // Run the migration
    await migrateBirthdayReminders();
    
    // Verify database connection
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test-db');
    
    // Verify users were found and updated
    expect(User.find).toHaveBeenCalledWith({
      $or: [
        { birthdayReminder: { $exists: false } },
        { birthdayReminder: null }
      ]
    });
    
    // Verify updateMany was called with correct parameters
    expect(User.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['user1', 'user2', 'user3'] } },
      {
        $set: {
          birthdayReminder: {
            lastProcessedYear: null,
            nextReminder: null,
            active: true
          }
        }
      }
    );
    
    // Verify successful completion was logged
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('Migration complete')
    );
    
    // Verify database disconnection
    expect(mongoose.disconnect).toHaveBeenCalled();
  });
  
  it('should handle no users needing migration', async () => {
    // Mock User.countDocuments to return total users
    (User.countDocuments as jest.Mock).mockResolvedValue(150);
    
    // Mock User.find to return empty array (no users need migration)
    (User.find as jest.Mock).mockResolvedValue([]);
    
    // Run the migration
    await migrateBirthdayReminders();
    
    // Verify users were checked
    expect(User.find).toHaveBeenCalled();
    
    // Verify no updates were made
    expect(User.updateMany).not.toHaveBeenCalled();
    
    // Verify appropriate message was logged
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('No users need migration')
    );
  });
  
  it('should handle database connection errors', async () => {
    // Mock connection failure
    const connectionError = new Error('Connection failed');
    (mongoose.connect as jest.Mock).mockRejectedValue(connectionError);
    
    // Ensure process.exit doesn't actually exit during test
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => undefined as never);
    
    // Run the migration
    await migrateBirthdayReminders();
    
    // Verify error was logged with proper error handling
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error during birthday reminder migration'),
      connectionError
    );
    
    // Verify process attempted to exit with code 1
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // Clean up
    mockExit.mockRestore();
  });
  
  it('should handle database operation errors', async () => {
    // Mock successful connection
    (mongoose.connect as jest.Mock).mockResolvedValue({});
    
    // Mock User.countDocuments
    (User.countDocuments as jest.Mock).mockResolvedValue(150);
    
    // Mock User.find to throw error
    const operationError = new Error('Database operation failed');
    (User.find as jest.Mock).mockRejectedValue(operationError);
    
    // Ensure process.exit doesn't actually exit during test
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => undefined as never);
    
    // Run the migration
    await migrateBirthdayReminders();
    
    // Verify error was logged with proper error handling
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error during birthday reminder migration'),
      operationError
    );
    
    // Verify disconnect was still called
    expect(mongoose.disconnect).toHaveBeenCalled();
    
    // Verify process attempted to exit with code 1
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // Clean up
    mockExit.mockRestore();
  });
});
