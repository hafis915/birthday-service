import User from '../models/user.model';
import { UserDocument } from '../types';
import birthdayService from './birthday.service';
import Logger from '../utils/logger';

// Initialize logger
const logger = new Logger('UserService');

/**
 * User service with business logic related to users
 */
export class UserService {
  /**
   * Create a new user
   * @param userData - User data to create
   * @returns Created user document
   */
  async createUser(userData: Partial<UserDocument>): Promise<UserDocument> {
    try {
      const newUser = await User.create(userData);
      
      // Schedule birthday reminder for the new user
      birthdayService.scheduleBirthdayReminder(newUser);
      logger.info(`Birthday reminder scheduled for new user: ${newUser.name}`);
      
      return newUser.toObject();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all users
   * @returns Array of user documents
   */
  async getAllUsers(): Promise<UserDocument[]> {
    try {
      const users = await User.find({ active: true }).select('-password');
      return users;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param userId - User ID
   * @returns User document
   */
  async getUserById(userId: string): Promise<UserDocument | null> {
    try {
      const user = await User.findById(userId).select('-password');
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user by ID
   * @param userId - User ID
   * @param updateData - Data to update
   * @returns Updated user document
   */
  async updateUser(userId: string, updateData: Partial<UserDocument>): Promise<UserDocument | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId, 
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
      
      // If the user exists and birthday or timezone was updated, update the reminder
      if (user && (updateData.birthday || updateData.timezone)) {
        birthdayService.updateBirthdayReminder(user);
        logger.info(`Birthday reminder updated for user: ${user.name}`);
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user by ID (soft delete - set active to false)
   * @param userId - User ID
   * @returns Deleted user document
   */
  async deleteUser(userId: string): Promise<UserDocument | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId, 
        { active: false },
        { new: true }
      );
      
      // Cancel the birthday reminder when a user is deleted
      if (user) {
        birthdayService.cancelBirthdayReminder(userId);
        logger.info(`Birthday reminder canceled for deleted user: ${user.name}`);
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns User document
   */
  async findUserByEmail(email: string): Promise<UserDocument | null> {
    try {
      const user = await User.findOne({ email });
      return user;
    } catch (error) {
      throw error;
    }
  }
}

export default new UserService();
