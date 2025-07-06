import { UserService } from '../../src/services/user.service';
import birthdayService from '../../src/services/birthday.service';
import User from '../../src/models/user.model';
import { UserDocument } from '../../src/types';

// Initialize service
const userService = new UserService();

// Mock dependencies
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/birthday.service');
jest.mock('../../src/utils/logger', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }))
  };
});

describe('UserService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock user data for testing
  const mockUserData = {
    name: 'Test User',
    email: 'test@example.com',
    birthday: new Date('1990-10-15'),
    timezone: 'America/New_York',
  };

  const mockUserDocument = {
    _id: 'user123',
    ...mockUserData,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnValue({
      _id: 'user123',
      ...mockUserData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  };

  describe('createUser', () => {
    it('should create a user and schedule a birthday reminder', async () => {
      // Mock User.create
      (User.create as jest.Mock).mockResolvedValue(mockUserDocument);
      
      // Mock birthdayService.scheduleBirthdayReminder
      (birthdayService.scheduleBirthdayReminder as jest.Mock).mockReturnValue(undefined);

      // Call the service method
      const result = await userService.createUser(mockUserData);

      // Verify User.create was called with the correct data
      expect(User.create).toHaveBeenCalledWith(mockUserData);
      
      // Verify that birthdayService.scheduleBirthdayReminder was called
      expect(birthdayService.scheduleBirthdayReminder).toHaveBeenCalledWith(mockUserDocument);
      
      // Verify the result
      expect(result).toEqual(mockUserDocument.toObject());
    });
  });

  describe('getAllUsers', () => {
    it('should return all active users', async () => {
      // Mock User.find
      const mockUsersList = [mockUserDocument, {...mockUserDocument, _id: 'user456', name: 'User 2'}];
      const mockFindResult = {
        select: jest.fn().mockReturnValue(mockUsersList),
      };
      (User.find as jest.Mock).mockReturnValue(mockFindResult);

      // Call the service method
      const result = await userService.getAllUsers();

      // Verify User.find was called with active:true filter
      expect(User.find).toHaveBeenCalledWith({ active: true });
      expect(mockFindResult.select).toHaveBeenCalledWith('-password');
      
      // Verify the result
      expect(result).toEqual(mockUsersList);
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      // Mock User.findById
      const mockFindResult = {
        select: jest.fn().mockReturnValue(mockUserDocument),
      };
      (User.findById as jest.Mock).mockReturnValue(mockFindResult);

      // Call the service method
      const result = await userService.getUserById('user123');

      // Verify User.findById was called with the correct ID
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockFindResult.select).toHaveBeenCalledWith('-password');
      
      // Verify the result
      expect(result).toEqual(mockUserDocument);
    });

    it('should return null when user is not found', async () => {
      // Mock User.findById
      const mockFindResult = {
        select: jest.fn().mockReturnValue(null),
      };
      (User.findById as jest.Mock).mockReturnValue(mockFindResult);

      // Call the service method
      const result = await userService.getUserById('nonexistent');

      // Verify User.findById was called with the correct ID
      expect(User.findById).toHaveBeenCalledWith('nonexistent');
      expect(mockFindResult.select).toHaveBeenCalledWith('-password');
      
      // Verify the result
      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should return a user by email', async () => {
      // Mock User.findOne
      (User.findOne as jest.Mock).mockResolvedValue(mockUserDocument);

      // Call the service method
      const result = await userService.findUserByEmail('test@example.com');

      // Verify User.findOne was called with the correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      
      // Verify the result
      expect(result).toEqual(mockUserDocument);
    });

    it('should return null when no user with the email is found', async () => {
      // Mock User.findOne
      (User.findOne as jest.Mock).mockResolvedValue(null);

      // Call the service method
      const result = await userService.findUserByEmail('nonexistent@example.com');

      // Verify User.findOne was called with the correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      
      // Verify the result
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update a user and update birthday reminder when birthday is changed', async () => {
      // Mock User.findByIdAndUpdate
      const mockSelectFn = jest.fn().mockResolvedValue(mockUserDocument);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        select: mockSelectFn
      });
      
      // Mock birthdayService.updateBirthdayReminder
      (birthdayService.updateBirthdayReminder as jest.Mock).mockReturnValue(undefined);

      const updateData = {
        birthday: new Date('1990-12-25'),
      };

      // Call the service method
      const result = await userService.updateUser('user123', updateData);

      // Verify User.findByIdAndUpdate was called with the correct data
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        updateData,
        { new: true, runValidators: true }
      );
      expect(mockSelectFn).toHaveBeenCalledWith('-password');
      
      // Verify that birthdayService.updateBirthdayReminder was called
      expect(birthdayService.updateBirthdayReminder).toHaveBeenCalledWith(mockUserDocument);
      
      // Verify the result
      expect(result).toEqual(mockUserDocument);
    });

    it('should not update birthday reminder when unrelated fields are changed', async () => {
      // Mock User.findByIdAndUpdate
      const mockSelectFn = jest.fn().mockResolvedValue(mockUserDocument);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        select: mockSelectFn
      });

      const updateData = {
        name: 'Updated Name',
      };

      // Call the service method
      const result = await userService.updateUser('user123', updateData);

      // Verify User.findByIdAndUpdate was called with the correct data
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        updateData,
        { new: true, runValidators: true }
      );
      expect(mockSelectFn).toHaveBeenCalledWith('-password');
      
      // Verify that birthdayService.updateBirthdayReminder was not called
      expect(birthdayService.updateBirthdayReminder).not.toHaveBeenCalled();
      
      // Verify the result
      expect(result).toEqual(mockUserDocument);
    });

    it('should update birthday reminder when timezone is changed', async () => {
      // Mock User.findByIdAndUpdate
      const mockSelectFn = jest.fn().mockResolvedValue(mockUserDocument);
      (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
        select: mockSelectFn
      });
      
      // Mock birthdayService.updateBirthdayReminder
      (birthdayService.updateBirthdayReminder as jest.Mock).mockReturnValue(undefined);

      const updateData = {
        timezone: 'Europe/London',
      };

      // Call the service method
      const result = await userService.updateUser('user123', updateData);

      // Verify User.findByIdAndUpdate was called with the correct data
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        updateData,
        { new: true, runValidators: true }
      );
      expect(mockSelectFn).toHaveBeenCalledWith('-password');
      
      // Verify that birthdayService.updateBirthdayReminder was called
      expect(birthdayService.updateBirthdayReminder).toHaveBeenCalledWith(mockUserDocument);
      
      // Verify the result
      expect(result).toEqual(mockUserDocument);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and cancel the birthday reminder', async () => {
      // Mock User.findByIdAndUpdate for soft delete
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUserDocument);
      
      // Mock birthdayService.cancelBirthdayReminder
      (birthdayService.cancelBirthdayReminder as jest.Mock).mockReturnValue(undefined);

      // Call the service method
      const result = await userService.deleteUser('user123');

      // Verify User.findByIdAndUpdate was called to set active=false
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        { active: false },
        { new: true }
      );
      
      // Verify that birthdayService.cancelBirthdayReminder was called
      expect(birthdayService.cancelBirthdayReminder).toHaveBeenCalledWith('user123');
      
      // Verify the result
      expect(result).toEqual(mockUserDocument);
    });

    it('should handle when user is not found during deletion', async () => {
      // Mock User.findByIdAndUpdate for soft delete
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
      
      // Mock birthdayService.cancelBirthdayReminder
      (birthdayService.cancelBirthdayReminder as jest.Mock).mockReturnValue(undefined);
      
      // Call the service method
      const result = await userService.deleteUser('nonexistent');

      // Verify User.findByIdAndUpdate was called to set active=false
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'nonexistent',
        { active: false },
        { new: true }
      );
      
      // Verify that birthdayService.cancelBirthdayReminder was not called
      expect(birthdayService.cancelBirthdayReminder).not.toHaveBeenCalled();
      
      // Verify the result
      expect(result).toBeNull();
    });
  });
});
