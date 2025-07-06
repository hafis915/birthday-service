import { Request, Response, NextFunction } from 'express';
import { AppError } from '../handlers/error.handler';
import userService from '../services/user.service';
import { ApiResponse, UserDocument } from '../types';

/**
 * User controller with handlers for user-related routes
 */
export class UserController {
  /**
   * Create a new user
   * @route POST /api/users
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      
      // Check if user with email already exists
      const existingUser = await userService.findUserByEmail(userData.email);
      if (existingUser) {
        return next(new AppError('User with this email already exists', 400));
      }
      
      const user = await userService.createUser(userData);
      
      const response: ApiResponse<UserDocument> = {
        status: 'success',
        statusCode: 201,
        data: user,
        message: 'User created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users
   * @route GET /api/users
   */
  getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await userService.getAllUsers();
      
      const response: ApiResponse<UserDocument[]> = {
        status: 'success',
        statusCode: 200,
        data: users
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * @route GET /api/users/:id
   */
  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.id;
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      
      const response: ApiResponse<UserDocument> = {
        status: 'success',
        statusCode: 200,
        data: user
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user by ID
   * @route PATCH /api/users/:id
   */
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      
      // Prevent role change through this endpoint for security
      if (updateData.role) {
        return next(new AppError('Not allowed to change role through this endpoint', 403));
      }
      
      const user = await userService.updateUser(userId, updateData);
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      
      const response: ApiResponse<UserDocument> = {
        status: 'success',
        statusCode: 200,
        data: user,
        message: 'User updated successfully'
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user by ID
   * @route DELETE /api/users/:id
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.id;
      const user = await userService.deleteUser(userId);
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      
      const response: ApiResponse<null> = {
        status: 'success',
        statusCode: 204,
        data: null,
        message: 'User deleted successfully'
      };
      
      res.status(204).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
