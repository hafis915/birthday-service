import * as cronJobs from '../../src/jobs/cron';
import cron from 'node-cron';
import User from '../../src/models/user.model';
import birthdayService from '../../src/services/birthday.service';
import Logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/birthday.service');
jest.mock('../../src/utils/logger');

describe('Cron Jobs', () => {
  // Mock logger instance
  const mockLoggerInfo = jest.fn();
  const mockLoggerError = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Logger mock implementation
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => ({
      info: mockLoggerInfo,
      warn: jest.fn(),
      error: mockLoggerError
    } as any));
  });

  // Mock users for testing
  const mockUsers = [
    {
      _id: 'user1',
      name: 'User One',
      email: 'user1@example.com',
      birthday: new Date('1990-05-15'),
      timezone: 'America/New_York'
    },
    {
      _id: 'user2',
      name: 'User Two',
      email: 'user2@example.com',
      birthday: new Date('1985-10-20'),
      timezone: 'Europe/London'
    }
  ];

  describe('initializeBirthdayReminders', () => {
    it('should fetch all active users and initialize reminders', async () => {
      // Mock dependencies
      (User.find as jest.Mock).mockResolvedValue(mockUsers);

      // Call the function
      await cronJobs.initializeBirthdayReminders();

      // Assertions
      expect(User.find).toHaveBeenCalledWith({ active: true });
      expect(birthdayService.initializeAllReminders).toHaveBeenCalledWith(mockUsers);
    });

    it('should handle errors during initialization', async () => {
      // Mock dependencies to throw error
      const mockError = new Error('Database connection failed');
      (User.find as jest.Mock).mockRejectedValue(mockError);

      // Call the function
      await cronJobs.initializeBirthdayReminders();

      // Should not throw error but log it
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize'),
        mockError
      );
    });

    it('should handle empty user list', async () => {
      // Mock empty user list
      (User.find as jest.Mock).mockResolvedValue([]);

      // Call the function
      await cronJobs.initializeBirthdayReminders();

      // Should initialize reminders with empty array
      expect(birthdayService.initializeAllReminders).toHaveBeenCalledWith([]);
    });
  });

  describe('setupDailyCleanupJob', () => {
    it('should schedule a daily cleanup job at midnight', () => {
      // Mock cron.validate to return true
      (cron.validate as jest.Mock).mockReturnValue(true);
      
      // Call the function
      cronJobs.setupDailyCleanupJob();

      // Assertions
      expect(cron.validate).toHaveBeenCalledWith('0 0 * * *');
      expect(cron.schedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
      expect(mockLoggerInfo).toHaveBeenCalledWith('Daily cleanup job scheduled');
    });

    it('should log an error if cron expression is invalid', () => {
      // Mock cron.validate to return false
      (cron.validate as jest.Mock).mockReturnValue(false);
      
      // Call the function
      cronJobs.setupDailyCleanupJob();

      // Assertions
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid cron schedule')
      );
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should execute cleanup logic when the job runs', async () => {
      // Mock cron.validate and capture the scheduled function
      (cron.validate as jest.Mock).mockReturnValue(true);
      let scheduledFn: Function | undefined;
      (cron.schedule as jest.Mock).mockImplementation((_, fn) => {
        scheduledFn = fn;
        return { start: jest.fn() };
      });
      
      // Setup the job
      cronJobs.setupDailyCleanupJob();
      
      // Run the captured function
      if (scheduledFn) {
        await scheduledFn();
        
        // Verify logs show job execution
        expect(mockLoggerInfo).toHaveBeenCalledWith('Running daily cleanup job');
        expect(mockLoggerInfo).toHaveBeenCalledWith('Daily cleanup job completed');
      } else {
        fail('Scheduled function was not captured');
      }
    });
    
    it('should handle errors during job execution', async () => {
      // Mock cron.validate and capture the scheduled function
      (cron.validate as jest.Mock).mockReturnValue(true);
      let scheduledFn: Function | undefined;
      (cron.schedule as jest.Mock).mockImplementation((_, fn) => {
        scheduledFn = fn;
        return { start: jest.fn() };
      });
      
      // Setup the job
      cronJobs.setupDailyCleanupJob();
      
      // Force an error during execution by mocking a function called inside the job
      const mockError = new Error('Cleanup operation failed');
      jest.spyOn(global, 'Promise').mockImplementationOnce(() => {
        throw mockError;
      });
      
      // Run the captured function
      if (scheduledFn) {
        await scheduledFn();
        
        // Verify error was logged
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.stringContaining('Error in daily cleanup job:'),
          expect.any(Error)
        );
      } else {
        fail('Scheduled function was not captured');
      }
    });
  });

  describe('setupHourlyJob', () => {
    it('should schedule an hourly job', () => {
      // Mock cron.validate to return true
      (cron.validate as jest.Mock).mockReturnValue(true);
      
      // Call the function
      cronJobs.setupHourlyJob();

      // Assertions
      expect(cron.validate).toHaveBeenCalledWith('0 * * * *');
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
      expect(mockLoggerInfo).toHaveBeenCalledWith('Hourly job scheduled');
    });
  });

  describe('initializeCronJobs', () => {
    it('should set up all required cron jobs', async () => {
      // Mock internal functions
      const spySetupDaily = jest.spyOn(cronJobs, 'setupDailyCleanupJob');
      const spyInitBirthday = jest.spyOn(cronJobs, 'initializeBirthdayReminders');
      
      // Mock User.find
      (User.find as jest.Mock).mockResolvedValue(mockUsers);
      
      // Call the function
      await cronJobs.initializeCronJobs();

      // Assertions
      expect(spySetupDaily).toHaveBeenCalled();
      expect(spyInitBirthday).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('Initializing cron jobs');
      expect(mockLoggerInfo).toHaveBeenCalledWith('All cron jobs initialized');
    });
  });
});
