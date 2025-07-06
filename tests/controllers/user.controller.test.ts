import { Request, Response } from 'express';
import { UserController } from '../../src/controllers/user.controller';
import userService from '../../src/services/user.service';
import { AppError } from '../../src/handlers/error.handler';

// Mock dependencies
jest.mock('../../src/services/user.service');
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

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    userController = new UserController();
    mockRequest = {
      body: {},
      params: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      birthday: '1990-05-15',
      timezone: 'America/New_York'
    };

    const mockCreatedUser = {
      _id: 'user123',
      ...validUserData,
      birthday: new Date(validUserData.birthday),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should create a new user successfully', async () => {
      // Setup mocks
      mockRequest.body = validUserData;
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (userService.createUser as jest.Mock).mockResolvedValue(mockCreatedUser);

      // Call the controller method
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assertions
      expect(userService.findUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(userService.createUser).toHaveBeenCalledWith(validUserData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        statusCode: 201,
        data: mockCreatedUser,
        message: 'User created successfully'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return an error if email already exists', async () => {
      // Setup mocks
      mockRequest.body = validUserData;
      (userService.findUserByEmail as jest.Mock).mockResolvedValue({ _id: 'existing123', email: validUserData.email });

      // Call the controller method
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assertions
      expect(userService.findUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(userService.createUser).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('already exists');
    });

    it('should pass any service errors to the error handler', async () => {
      // Setup mocks
      mockRequest.body = validUserData;
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      const mockError = new Error('Database error');
      (userService.createUser as jest.Mock).mockRejectedValue(mockError);

      // Call the controller method
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assertions
      expect(userService.findUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(userService.createUser).toHaveBeenCalledWith(validUserData);
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });

    // Edge case: Missing required fields
    it('should handle validation errors from missing fields', async () => {
      // Setup mocks with missing fields
      mockRequest.body = { name: 'John Doe' }; // Missing email, birthday, timezone
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      
      const validationError = new Error('Validation error');
      validationError.name = 'ValidationError';
      (userService.createUser as jest.Mock).mockRejectedValue(validationError);

      // Call the controller method
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assertions
      expect(userService.createUser).toHaveBeenCalledWith({ name: 'John Doe' });
      expect(mockNext).toHaveBeenCalledWith(validationError);
    });
    
    // Edge case: Invalid data types
    it('should handle invalid date format in request', async () => {
      // Setup mocks with invalid date
      mockRequest.body = {
        ...validUserData,
        birthday: 'not-a-date'
      };
      (userService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      
      const dateError = new Error('Cast error: birthday must be a valid date');
      dateError.name = 'CastError';
      (userService.createUser as jest.Mock).mockRejectedValue(dateError);

      // Call the controller method
      await userController.createUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assertions
      expect(mockNext).toHaveBeenCalledWith(dateError);
    });
  });

  // Add more controller method tests as needed
});
