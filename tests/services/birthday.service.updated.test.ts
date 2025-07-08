import birthdayService from '../../src/services/birthday.service';
import User from '../../src/models/user.model';
import { UserDocument } from '../../src/types';
import Logger from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/models/user.model');
jest.mock('../../src/utils/logger');

describe('BirthdayService - Updated Implementation', () => {
  // Mock logger instance
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'info').mockImplementation(mockLogger.info);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLogger.warn);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
    
    // Reset User.findByIdAndUpdate mock
    (User.findByIdAndUpdate as jest.Mock).mockReset();
  });

  // Mock user data for testing
  const mockUser: UserDocument = {
    _id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    birthday: new Date('1990-10-15'),
    timezone: 'America/New_York',
    birthdayReminder: {
      lastProcessedYear: null,
      nextReminder: null,
      active: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock updated user after DB operation
  const mockUpdatedUser = {
    ...mockUser,
    birthdayReminder: {
      ...mockUser.birthdayReminder,
      nextReminder: new Date('2023-10-15T09:00:00.000Z')
    }
  };

  describe('calculateNextBirthday', () => {
    // Mock current date for tests
    let originalDateNow: () => number;
    
    beforeEach(() => {
      // Save original Date.now
      originalDateNow = Date.now;
      
      // Mock Date.now to return a fixed date: July 1, 2023
      const mockDate = new Date('2023-07-01T12:00:00.000Z').getTime();
      global.Date.now = jest.fn(() => mockDate);
    });
    
    afterEach(() => {
      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
    
    it('should calculate the next birthday in the current year if not yet passed', () => {
      // Birthday in October hasn't passed yet (current date is July)
      const nextBirthday = birthdayService.calculateNextBirthday(mockUser);
      
      // Should be October 15, 2023 at 9:00 UTC
      expect(nextBirthday).toEqual(new Date('2023-10-15T09:00:00.000Z'));
    });
    
    it('should calculate the next birthday in the next year if already passed', () => {
      // Mock a user with May birthday (which has already passed in July)
      const userWithPassedBirthday = {
        ...mockUser,
        birthday: new Date('1990-05-15')
      };
      
      const nextBirthday = birthdayService.calculateNextBirthday(userWithPassedBirthday);
      
      // Should be May 15, 2024 at 9:00 UTC
      expect(nextBirthday).toEqual(new Date('2024-05-15T09:00:00.000Z'));
    });
    
    it('should return null if no birthday or timezone is provided', () => {
      // User without birthday
      const userWithoutBirthday = {
        ...mockUser,
        birthday: undefined
      };
      
      expect(birthdayService.calculateNextBirthday(userWithoutBirthday as any)).toBeNull();
      
      // User without timezone
      const userWithoutTimezone = {
        ...mockUser,
        timezone: undefined
      };
      
      expect(birthdayService.calculateNextBirthday(userWithoutTimezone as any)).toBeNull();
    });
    
    it('should handle February 29th for non-leap years', () => {
      // Mock a user with Feb 29th birthday
      const leapYearUser = {
        ...mockUser,
        birthday: new Date('2000-02-29') // Leap year
      };
      
      // Mock current date to be in 2023 (non-leap year)
      const mockDate = new Date('2023-01-01T12:00:00.000Z').getTime();
      global.Date.now = jest.fn(() => mockDate);
      
      const nextBirthday = birthdayService.calculateNextBirthday(leapYearUser);
      
      // Should be March 1, 2023 for non-leap years
      expect(nextBirthday).toEqual(new Date('2023-03-01T09:00:00.000Z'));
    });
    
    it('should use February 29th for leap years', () => {
      // Mock a user with Feb 29th birthday
      const leapYearUser = {
        ...mockUser,
        birthday: new Date('2000-02-29') // Leap year
      };
      
      // Mock current date to be in 2024 (leap year)
      const mockDate = new Date('2024-01-01T12:00:00.000Z').getTime();
      global.Date.now = jest.fn(() => mockDate);
      
      const nextBirthday = birthdayService.calculateNextBirthday(leapYearUser);
      
      // Should be February 29, 2024 for leap years
      expect(nextBirthday).toEqual(new Date('2024-02-29T09:00:00.000Z'));
    });
  });

  describe('scheduleBirthdayReminder', () => {
    it('should update user document with next reminder date', async () => {
      // Mock the database update
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);
      
      // Mock calculateNextBirthday
      jest.spyOn(birthdayService, 'calculateNextBirthday').mockReturnValue(
        new Date('2023-10-15T09:00:00.000Z')
      );

      const result = await birthdayService.scheduleBirthdayReminder(mockUser);

      // Verify database update call
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        {
          'birthdayReminder.nextReminder': new Date('2023-10-15T09:00:00.000Z'),
          'birthdayReminder.active': true
        },
        { new: true }
      );
      
      // Verify the updated user is returned
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should not update if birthday or timezone is missing', async () => {
      const userWithoutBirthday = {
        ...mockUser,
        birthday: undefined
      };

      const result = await birthdayService.scheduleBirthdayReminder(userWithoutBirthday as any);

      // Verify no database call was made
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
      
      // Should return null
      expect(result).toBeNull();
      
      // Should log a warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot schedule birthday reminder')
      );
    });
    
    it('should handle database errors', async () => {
      const dbError = new Error('Database connection error');
      
      // Mock calculateNextBirthday
      jest.spyOn(birthdayService, 'calculateNextBirthday').mockReturnValue(
        new Date('2023-10-15T09:00:00.000Z')
      );
      
      // Mock database error
      (User.findByIdAndUpdate as jest.Mock).mockRejectedValue(dbError);
      
      const result = await birthdayService.scheduleBirthdayReminder(mockUser);
      
      // Should return null on error
      expect(result).toBeNull();
      
      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to schedule birthday reminder for user ${mockUser._id}`),
        dbError
      );
    });
  });

  describe('cancelBirthdayReminder', () => {
    it('should update user document to deactivate reminder', async () => {
      // Mock the database update
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      const result = await birthdayService.cancelBirthdayReminder(mockUser._id);

      // Verify database update call
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { 'birthdayReminder.active': false }
      );
      
      // Should return true on success
      expect(result).toBe(true);
      
      // Should log the action
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Birthday reminder for user ${mockUser._id} deactivated`)
      );
    });

    it('should return false if no user is found', async () => {
      // Mock no user found (null return from database)
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      const result = await birthdayService.cancelBirthdayReminder('nonexistentId');

      // Should return false
      expect(result).toBe(false);
    });
    
    it('should handle database errors', async () => {
      const dbError = new Error('Database connection error');
      
      // Mock database error
      (User.findByIdAndUpdate as jest.Mock).mockRejectedValue(dbError);
      
      const result = await birthdayService.cancelBirthdayReminder(mockUser._id);
      
      // Should return false on error
      expect(result).toBe(false);
      
      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to cancel birthday reminder for user ${mockUser._id}`),
        dbError
      );
    });
  });

  describe('processBirthdayReminders', () => {
    // Create more realistic mock users for batch processing tests
    const mockUsers = [
      {
        _id: 'user1',
        name: 'User One',
        birthday: new Date('1990-01-15'),
        timezone: 'America/New_York',
        birthdayReminder: {
          lastProcessedYear: null,
          nextReminder: new Date('2023-07-01T10:00:00Z'), // Due today
          active: true
        }
      },
      {
        _id: 'user2',
        name: 'User Two',
        birthday: new Date('1985-07-02'),
        timezone: 'Europe/London',
        birthdayReminder: {
          lastProcessedYear: null,
          nextReminder: new Date('2023-07-01T11:00:00Z'), // Due today
          active: true
        }
      },
      {
        _id: 'user3',
        name: 'User Three',
        birthday: new Date('1992-12-25'),
        timezone: 'Asia/Tokyo',
        birthdayReminder: {
          lastProcessedYear: 2023, // Already processed this year
          nextReminder: new Date('2023-07-01T12:00:00Z'), // Due today but already processed
          active: true
        }
      }
    ];

    beforeEach(() => {
      // Mock current date for tests to July 1, 2023, 9:30 AM
      const mockDate = new Date('2023-07-01T09:30:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((arg) => {
        if (arg === undefined) {
          return new Date(mockDate);
        }
        return new Date(arg);
      });
      
      // Allow actual Date.now to work
      const originalNow = Date.now;
      Date.now = jest.fn(() => mockDate.getTime());
    });
    
    afterEach(() => {
      // Restore original Date
      jest.restoreAllMocks();
    });

    it('should process due reminders in batches', async () => {
      // Mock User.find to return users with due reminders
      (User.find as jest.Mock).mockImplementation((query) => {
        return {
          skip: (skip: number) => ({
            limit: (limit: number) => {
              // First batch has users, second is empty to end loop
              if (skip === 0) {
                return Promise.resolve(mockUsers.slice(0, 2));
              }
              return Promise.resolve([]);
            }
          })
        };
      });
      
      // Mock User.findByIdAndUpdate for updating processed status
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...mockUsers[0] });
      
      // Mock scheduleBirthdayReminder
      jest.spyOn(birthdayService, 'scheduleBirthdayReminder')
        .mockResolvedValue(mockUsers[0] as any);
      
      const result = await birthdayService.processBirthdayReminders(100);
      
      // Should return count of sent notifications
      expect(result).toBe(2);
      
      // Should log birthday messages for users
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`🎉 Happy Birthday to ${mockUsers[0].name}!`)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`🎉 Happy Birthday to ${mockUsers[1].name}!`)
      );
      
      // Should update lastProcessedYear for both users
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUsers[0]._id,
        { 'birthdayReminder.lastProcessedYear': 2023 }
      );
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUsers[1]._id,
        { 'birthdayReminder.lastProcessedYear': 2023 }
      );
      
      // Should schedule next reminder for both users
      expect(birthdayService.scheduleBirthdayReminder).toHaveBeenCalledTimes(2);
    });
    
    it('should skip already processed reminders for current year', async () => {
      // Mock User.find to return a user that's already been processed this year
      (User.find as jest.Mock).mockImplementation(() => {
        return {
          skip: () => ({
            limit: () => Promise.resolve([mockUsers[2]])
          })
        };
      });
      
      // Mock scheduleBirthdayReminder
      jest.spyOn(birthdayService, 'scheduleBirthdayReminder')
        .mockResolvedValue(mockUsers[2] as any);
      
      const result = await birthdayService.processBirthdayReminders(100);
      
      // Should return 0 notifications (since already processed)
      expect(result).toBe(0);
      
      // Should not send birthday message
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining(`🎉 Happy Birthday to ${mockUsers[2].name}!`)
      );
      
      // Should still schedule next year's reminder
      expect(birthdayService.scheduleBirthdayReminder).toHaveBeenCalledTimes(1);
    });
    
    it('should handle errors for individual users', async () => {
      // Mock User.find to return users
      (User.find as jest.Mock).mockImplementation(() => {
        return {
          skip: () => ({
            limit: () => Promise.resolve([mockUsers[0], mockUsers[1]])
          })
        };
      });
      
      // Mock error for first user, success for second
      (User.findByIdAndUpdate as jest.Mock)
        .mockRejectedValueOnce(new Error('DB error')) // Error for user 1
        .mockResolvedValueOnce({ ...mockUsers[1] });   // Success for user 2
      
      // Mock scheduleBirthdayReminder
      jest.spyOn(birthdayService, 'scheduleBirthdayReminder')
        .mockRejectedValueOnce(new Error('Schedule error'))
        .mockResolvedValueOnce(mockUsers[1] as any);
      
      const result = await birthdayService.processBirthdayReminders(100);
      
      // Should return count of successfully sent notifications (only user 2)
      expect(result).toBe(1);
      
      // Should log errors for user 1
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error processing birthday reminder for user ${mockUsers[0]._id}`),
        expect.any(Error)
      );
      
      // Should log success for user 2
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`🎉 Happy Birthday to ${mockUsers[1].name}!`)
      );
    });
  });

  describe('processMissedReminders', () => {
    // Similar mock setup as processBirthdayReminders tests
    const mockUsers = [
      {
        _id: 'user1',
        name: 'User One',
        birthday: new Date('1990-01-15'),
        timezone: 'America/New_York',
        birthdayReminder: {
          lastProcessedYear: null,
          nextReminder: new Date('2023-06-30T10:00:00Z'), // Yesterday
          active: true
        }
      },
      {
        _id: 'user2',
        name: 'User Two',
        birthday: new Date('1985-06-30'),
        timezone: 'Europe/London',
        birthdayReminder: {
          lastProcessedYear: 2022, // Last year
          nextReminder: new Date('2023-06-30T11:00:00Z'), // Yesterday
          active: true
        }
      }
    ];

    beforeEach(() => {
      // Mock current date for tests to July 1, 2023, 9:30 AM
      const mockDate = new Date('2023-07-01T09:30:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation((arg) => {
        if (arg === undefined) {
          return new Date(mockDate);
        }
        return new Date(arg);
      });
      
      // Allow actual Date.now to work
      const originalNow = Date.now;
      Date.now = jest.fn(() => mockDate.getTime());
    });
    
    afterEach(() => {
      // Restore original Date
      jest.restoreAllMocks();
    });

    it('should process missed reminders within lookback period', async () => {
      // Mock User.find for missed reminders
      (User.find as jest.Mock).mockImplementation(() => {
        return {
          skip: () => ({
            limit: () => Promise.resolve(mockUsers)
          })
        };
      });
      
      // Mock User.findByIdAndUpdate for updating processed status
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...mockUsers[0] });
      
      // Mock scheduleBirthdayReminder
      jest.spyOn(birthdayService, 'scheduleBirthdayReminder')
        .mockResolvedValue(mockUsers[0] as any);
      
      const result = await birthdayService.processMissedReminders(24);
      
      // Should return count of sent notifications
      expect(result).toBe(2);
      
      // Should log belated birthday messages
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`🎉 Belated Happy Birthday to ${mockUsers[0].name}!`)
      );
      
      // Should update lastProcessedYear for both users
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUsers[0]._id,
        { 'birthdayReminder.lastProcessedYear': 2023 }
      );
      
      // Should schedule next reminder for both users
      expect(birthdayService.scheduleBirthdayReminder).toHaveBeenCalledTimes(2);
    });
  });

  describe('initializeAllReminders', () => {
    // Mock users needing initialization
    const usersNeedingInit = [
      {
        _id: 'user1',
        name: 'User One',
        birthday: new Date('1990-01-15'),
        timezone: 'America/New_York',
        birthdayReminder: { active: true }
      },
      {
        _id: 'user2',
        name: 'User Two',
        birthday: new Date('1985-06-30'),
        timezone: 'Europe/London',
        birthdayReminder: { active: true }
      }
    ];

    it('should initialize reminders for users in batches', async () => {
      // Mock User.find for users without reminders
      (User.find as jest.Mock).mockImplementation(() => {
        return {
          skip: (skip: number) => ({
            limit: (limit: number) => {
              // First batch has users, second is empty to end loop
              if (skip === 0) {
                return Promise.resolve(usersNeedingInit);
              }
              return Promise.resolve([]);
            }
          })
        };
      });
      
      // Mock scheduleBirthdayReminder
      const scheduleSpy = jest.spyOn(birthdayService, 'scheduleBirthdayReminder')
        .mockResolvedValue(usersNeedingInit[0] as any);
      
      const result = await birthdayService.initializeAllReminders(100);
      
      // Should return count of processed users
      expect(result).toBe(2);
      
      // Should call scheduleBirthdayReminder for each user
      expect(scheduleSpy).toHaveBeenCalledTimes(2);
      
      // Should log completion
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Birthday reminder initialization complete')
      );
    });
    
    it('should handle errors during initialization', async () => {
      // Mock User.find
      (User.find as jest.Mock).mockImplementation(() => {
        return {
          skip: () => ({
            limit: () => Promise.resolve(usersNeedingInit)
          })
        };
      });
      
      // Mock scheduleBirthdayReminder to throw for first user
      jest.spyOn(birthdayService, 'scheduleBirthdayReminder')
        .mockRejectedValueOnce(new Error('Failed to schedule'))
        .mockResolvedValueOnce(usersNeedingInit[1] as any);
      
      const result = await birthdayService.initializeAllReminders(100);
      
      // Should still count both users as processed
      expect(result).toBe(2);
      
      // Should log error for first user
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error initializing reminder for user ${usersNeedingInit[0]._id}`),
        expect.any(Error)
      );
    });
    
    it('should handle database query errors', async () => {
      // Mock User.find to throw error
      (User.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection error');
      });
      
      const result = await birthdayService.initializeAllReminders(100);
      
      // Should return 0 processed
      expect(result).toBe(0);
      
      // Should log error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error initializing birthday reminders'),
        expect.any(Error)
      );
    });
  });
});
