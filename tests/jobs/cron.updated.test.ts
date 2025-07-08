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

describe('Cron Jobs - Updated Implementation', () => {
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
    
    // Reset setTimeout mock
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
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
  });

  describe('setupHourlyJob', () => {
    it('should schedule an hourly job to process birthday reminders', () => {
      // Mock cron.validate to return true
      (cron.validate as jest.Mock).mockReturnValue(true);
      
      // Call the function
      cronJobs.setupHourlyJob();

      // Assertions
      expect(cron.validate).toHaveBeenCalledWith('0 * * * *');
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
      expect(mockLoggerInfo).toHaveBeenCalledWith('Hourly job scheduled');
    });
    
    it('should call birthdayService.processBirthdayReminders when job executes', async () => {
      // Mock cron.validate and capture the scheduled function
      (cron.validate as jest.Mock).mockReturnValue(true);
      let scheduledFn: Function | undefined;
      (cron.schedule as jest.Mock).mockImplementation((_, fn) => {
        scheduledFn = fn;
        return { start: jest.fn() };
      });
      
      // Setup the job
      cronJobs.setupHourlyJob();
      
      // Mock processBirthdayReminders to return some value
      (birthdayService.processBirthdayReminders as jest.Mock).mockResolvedValue(5);
      
      // Run the captured function
      if (scheduledFn) {
        await scheduledFn();
        
        // Verify birthdayService was called
        expect(birthdayService.processBirthdayReminders).toHaveBeenCalled();
        expect(mockLoggerInfo).toHaveBeenCalledWith('Running hourly job');
        expect(mockLoggerInfo).toHaveBeenCalledWith('Hourly job completed');
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
      cronJobs.setupHourlyJob();
      
      // Mock processBirthdayReminders to throw error
      const mockError = new Error('Processing failed');
      (birthdayService.processBirthdayReminders as jest.Mock).mockRejectedValue(mockError);
      
      // Run the captured function
      if (scheduledFn) {
        await scheduledFn();
        
        // Verify error is logged
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.stringContaining('Error in hourly job'),
          mockError
        );
      } else {
        fail('Scheduled function was not captured');
      }
    });
  });
  
  describe('setupMissedRemindersJob', () => {
    it('should set up a delayed job to process missed reminders', () => {
      // Call the function
      cronJobs.setupMissedRemindersJob();
      
      // Should set up a timeout
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
    
    it('should call birthdayService.processMissedReminders when executed', () => {
      // Mock processMissedReminders
      (birthdayService.processMissedReminders as jest.Mock).mockResolvedValue(3);
      
      // Call the function
      cronJobs.setupMissedRemindersJob();
      
      // Fast-forward timer
      jest.runAllTimers();
      
      // Verify service was called
      expect(birthdayService.processMissedReminders).toHaveBeenCalledWith(24);
      expect(mockLoggerInfo).toHaveBeenCalledWith('Running missed reminders check');
      expect(mockLoggerInfo).toHaveBeenCalledWith('Missed reminders check completed');
    });
    
    it('should handle errors during missed reminders check', () => {
      // Mock processMissedReminders to throw
      const mockError = new Error('Processing failed');
      (birthdayService.processMissedReminders as jest.Mock).mockRejectedValue(mockError);
      
      // Call the function
      cronJobs.setupMissedRemindersJob();
      
      // Fast-forward timer
      jest.runAllTimers();
      
      // Verify error is logged
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('Error checking missed reminders'),
        mockError
      );
    });
  });

  describe('initializeBirthdayReminders', () => {
    it('should call birthdayService.initializeAllReminders with batch size', async () => {
      // Mock initializeAllReminders to return some count
      (birthdayService.initializeAllReminders as jest.Mock).mockResolvedValue(10);

      // Call the function
      await cronJobs.initializeBirthdayReminders();

      // Verify service called with batch size
      expect(birthdayService.initializeAllReminders).toHaveBeenCalledWith(100);
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('Birthday reminders initialized for 10 users')
      );
    });

    it('should handle errors during initialization', async () => {
      // Mock service to throw error
      const mockError = new Error('Initialization failed');
      (birthdayService.initializeAllReminders as jest.Mock).mockRejectedValue(mockError);

      // Call the function
      await cronJobs.initializeBirthdayReminders();

      // Should log the error
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize birthday reminders'),
        mockError
      );
    });
  });

  describe('initializeCronJobs', () => {
    it('should set up all required cron jobs', async () => {
      // Mock internal functions
      const spySetupDaily = jest.spyOn(cronJobs, 'setupDailyCleanupJob').mockImplementation(() => {});
      const spySetupHourly = jest.spyOn(cronJobs, 'setupHourlyJob').mockImplementation(() => {});
      const spySetupMissed = jest.spyOn(cronJobs, 'setupMissedRemindersJob').mockImplementation(() => {});
      const spyInitBirthday = jest.spyOn(cronJobs, 'initializeBirthdayReminders').mockResolvedValue();
      
      // Call the function
      await cronJobs.initializeCronJobs();

      // Verify all jobs were set up
      expect(spySetupDaily).toHaveBeenCalled();
      expect(spySetupHourly).toHaveBeenCalled();
      expect(spySetupMissed).toHaveBeenCalled();
      expect(spyInitBirthday).toHaveBeenCalled();
      
      // Verify logs
      expect(mockLoggerInfo).toHaveBeenCalledWith('Initializing cron jobs');
      expect(mockLoggerInfo).toHaveBeenCalledWith('All cron jobs initialized');
    });
  });
});
