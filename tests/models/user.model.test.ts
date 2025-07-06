import mongoose from 'mongoose';
import User from '../../src/models/user.model';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Setup in-memory MongoDB server
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Model Validation', () => {
  // Test valid user creation
  it('should create a valid user with all required fields', async () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      birthday: new Date('1990-05-15'),
      timezone: 'America/New_York'
    };

    const user = new User(validUser);
    const savedUser = await user.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(validUser.name);
    expect(savedUser.email).toBe(validUser.email);
    expect(savedUser.birthday).toEqual(validUser.birthday);
    expect(savedUser.timezone).toBe(validUser.timezone);
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  // Test required fields
  it('should fail validation when required fields are missing', async () => {
    const userWithMissingFields = new User({});
    
    let error: any;
    try {
      await userWithMissingFields.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.birthday).toBeDefined();
    expect(error.errors.timezone).toBeDefined();
  });

  // Test email validation
  it('should fail validation with an invalid email format', async () => {
    const userWithInvalidEmail = new User({
      name: 'John Doe',
      email: 'invalid-email',
      birthday: new Date('1990-05-15'),
      timezone: 'America/New_York'
    });
    
    let error: any;
    try {
      await userWithInvalidEmail.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.email.message).toContain('valid email');
  });

  // Test timezone validation
  it('should fail validation with an invalid timezone', async () => {
    const userWithInvalidTimezone = new User({
      name: 'John Doe',
      email: 'john@example.com',
      birthday: new Date('1990-05-15'),
      timezone: 'Invalid/Timezone'
    });
    
    let error: any;
    try {
      await userWithInvalidTimezone.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.timezone).toBeDefined();
    expect(error.errors.timezone.message).toContain('not a valid timezone');
  });

  // Test email uniqueness
  it('should fail validation when email is already in use', async () => {
    // First create a user
    const user1 = new User({
      name: 'John Doe',
      email: 'duplicate@example.com',
      birthday: new Date('1990-05-15'),
      timezone: 'America/New_York'
    });
    await user1.save();
    
    // Try to create another user with the same email
    const user2 = new User({
      name: 'Jane Doe',
      email: 'duplicate@example.com',
      birthday: new Date('1991-06-20'),
      timezone: 'Europe/London'
    });
    
    let error: any;
    try {
      await user2.save();
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error code
  });
  
  // Edge case: Test with a past date
  it('should accept a past date as birthday', async () => {
    const userWithPastDate = new User({
      name: 'Old Timer',
      email: 'old@example.com',
      birthday: new Date('1900-01-01'),
      timezone: 'UTC'
    });
    
    const savedUser = await userWithPastDate.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.birthday.getFullYear()).toBe(1900);
  });

  // Edge case: Test with future date
  it('should accept a future date as birthday', async () => {
    const userWithFutureDate = new User({
      name: 'Future Kid',
      email: 'future@example.com',
      birthday: new Date('2050-12-31'),
      timezone: 'UTC'
    });
    
    const savedUser = await userWithFutureDate.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.birthday.getFullYear()).toBe(2050);
  });
});
