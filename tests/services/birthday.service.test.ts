import * as cron from 'node-cron';
import birthdayService from '../../src/services/birthday.service';
import { UserDocument } from '../../src/types';
import Logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../src/utils/logger');

describe('BirthdayService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'info').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  // Mock user data for testing
  const mockUser: UserDocument = {
    _id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    birthday: new Date('1990-10-15'),
    timezone: 'America/New_York',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock for the cron job object
  const mockCronJob = {
    stop: jest.fn()
  };

  describe('scheduleBirthdayReminder', () => {
    it('should schedule a birthday reminder for a valid user', () => {
      // Mock cron.schedule to return our mock job
      jest.spyOn(cron, 'schedule').mockReturnValue(mockCronJob as any);

      birthdayService.scheduleBirthdayReminder(mockUser);

      // Verify that cron.schedule was called with the correct parameters
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 9 15 10 *', // Should be 9 AM on October 15th
        expect.any(Function),
        { timezone: 'America/New_York' }
      );

      // Verify that the logger recorded the scheduling
      expect(Logger.prototype.info).toHaveBeenCalledWith(
        expect.stringContaining(`Scheduling birthday reminder for user ${mockUser.name}`)
      );
    });

    it('should not schedule a reminder if birthday is missing', () => {
      const userWithoutBirthday = { 
        ...mockUser, 
        birthday: undefined 
      };

      birthdayService.scheduleBirthdayReminder(userWithoutBirthday as any);

      // Verify that cron.schedule was not called
      expect(cron.schedule).not.toHaveBeenCalled();
      
      // Verify that a warning was logged
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing birthday or timezone')
      );
    });

    it('should not schedule a reminder if timezone is missing', () => {
      const userWithoutTimezone = { 
        ...mockUser, 
        timezone: undefined 
      };

      birthdayService.scheduleBirthdayReminder(userWithoutTimezone as any);

      // Verify that cron.schedule was not called
      expect(cron.schedule).not.toHaveBeenCalled();
      
      // Verify that a warning was logged
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('missing birthday or timezone')
      );
    });
  });

  describe('cancelBirthdayReminder', () => {
    it('should cancel an existing birthday reminder', () => {
      // Setup: First create a job
      jest.spyOn(cron, 'schedule').mockReturnValue(mockCronJob as any);
      birthdayService.scheduleBirthdayReminder(mockUser);
      
      // Manually set the job in the private map (since we can't access it directly)
      // @ts-ignore - Accessing private property for testing
      birthdayService['birthdayJobs'].set(mockUser._id, mockCronJob);

      // Test: Cancel the job
      birthdayService.cancelBirthdayReminder(mockUser._id);

      // Verify that the job's stop method was called
      expect(mockCronJob.stop).toHaveBeenCalled();
      
      // Verify that the cancellation was logged
      expect(Logger.prototype.info).toHaveBeenCalledWith(
        expect.stringContaining(`Birthday reminder for user ${mockUser._id} canceled`)
      );
    });

    it('should do nothing if no reminder exists for the user', () => {
      // Call cancel without first scheduling
      birthdayService.cancelBirthdayReminder('nonexistentUser');

      // Verify that no job stop method was called
      expect(mockCronJob.stop).not.toHaveBeenCalled();
      
      // Verify that no cancellation was logged
      expect(Logger.prototype.info).not.toHaveBeenCalledWith(
        expect.stringContaining('canceled')
      );
    });
  });

  describe('updateBirthdayReminder', () => {
    it('should update an existing birthday reminder', () => {
      // Setup: First create a job
      jest.spyOn(cron, 'schedule').mockReturnValue(mockCronJob as any);

      // Test: Update the reminder (which should cancel the old one and create a new one)
      const updatedUser = {
        ...mockUser,
        birthday: new Date('1990-12-25'),
      };
      birthdayService.updateBirthdayReminder(updatedUser);

      // Verify schedule was called with the updated date
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 9 25 12 *', // Should be 9 AM on December 25th
        expect.any(Function),
        { timezone: 'America/New_York' }
      );
    });
  });

  describe('initializeAllReminders', () => {
    it('should initialize reminders for multiple users', () => {
      // Mock another user
      const anotherUser = {
        ...mockUser,
        _id: 'user456',
        name: 'Another User',
        birthday: new Date('1985-05-10'),
      };

      jest.spyOn(cron, 'schedule').mockReturnValue(mockCronJob as any);
      
      // Initialize reminders for both users
      birthdayService.initializeAllReminders([mockUser, anotherUser]);

      // Verify schedule was called for both users
      expect(cron.schedule).toHaveBeenCalledTimes(2);
      
      // Verify the initialization was logged
      expect(Logger.prototype.info).toHaveBeenCalledWith(
        expect.stringContaining(`Initializing birthday reminders for 2 users`)
      );
      expect(Logger.prototype.info).toHaveBeenCalledWith(
        expect.stringContaining(`All birthday reminders initialized`)
      );
    });
  });
});
