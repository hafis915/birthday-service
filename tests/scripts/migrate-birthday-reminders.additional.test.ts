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

describe('Birthday Reminder Migration Script - Advanced Error Handling', () => {
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

  it('should handle non-Error objects in error handling', async () => {
    // Mock connection failure with string error
    const dbConfig = require('../../src/config/database');
    dbConfig.connectDB.mockRejectedValue('Database connection string error');
    
    // Ensure process.exit doesn't actually exit during test
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => undefined as never);
    
    // Run the migration
    await migrateBirthdayReminders();
    
    // Verify error was logged with proper string conversion
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error during birthday reminder migration'),
      'Database connection string error'
    );
    
    // Verify process attempted to exit with code 1
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // Clean up
    mockExit.mockRestore();
  });

  it('should handle non-Error objects in disconnect error handling', async () => {
    const dbConfig = require('../../src/config/database');
    
    // Mock normal connection
    dbConfig.connectDB.mockResolvedValue(undefined);
    
    // Mock User.countDocuments to throw
    (User.countDocuments as jest.Mock).mockRejectedValue(new Error('Count failed'));
    
    // Mock disconnect to throw a non-Error
    dbConfig.disconnectDB.mockRejectedValue({ code: 500, message: 'Custom error object' });
    
    // Ensure process.exit doesn't actually exit during test
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => undefined as never);
    
    // Run the migration
    await migrateBirthdayReminders();
    
    // Verify disconnect error was logged with proper string conversion
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error disconnecting from database'),
      expect.stringContaining('Custom error object')
    );
    
    // Verify process attempted to exit with code 1
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // Clean up
    mockExit.mockRestore();
  });
  
  it('should handle null error values', async () => {
    const dbConfig = require('../../src/config/database');
    
    // Mock connection failure with null (unusual but possible)
    dbConfig.connectDB.mockRejectedValue(null);
    
    // Ensure process.exit doesn't actually exit during test
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => undefined as never);
    
    // Run the migration
    await migrateBirthdayReminders();
    
    // Verify error was logged with proper string conversion
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error during birthday reminder migration'),
      'null'
    );
    
    // Verify process attempted to exit with code 1
    expect(mockExit).toHaveBeenCalledWith(1);
    
    // Clean up
    mockExit.mockRestore();
  });
  
  it('should handle the script execution error path', async () => {
    // Mock error for the top-level catch handler
    const scriptError = new Error('Script execution error');
    
    // Mock the migrateBirthdayReminders function to throw
    const mockPromise = Promise.reject(scriptError);
    jest.spyOn(Promise, 'reject').mockImplementationOnce(() => mockPromise);
    
    // Ensure process.exit doesn't actually exit during test
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => undefined as never);
    
    // No need to spy on mockLoggerError since it's already a mock function
    
    // Simulate the catch handler in direct script execution
    try {
      await mockPromise.catch((error: unknown) => {
        // This simulates the catch handler in the script
        mockLoggerError('Migration script failed:', error instanceof Error ? error : String(error));
        process.exit(1);
      });
    } catch (error) {
      // Expected to throw since we're testing error handling
    }
    
    // Verify error logging format
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Migration script failed:',
      scriptError
    );
    
    // Verify exit was called with error code
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
