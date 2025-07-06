import mongoose, { Schema } from 'mongoose';
import { UserDocument } from '../types';

// Define the User schema
const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(value: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: 'Please provide a valid email address'
    },
  },
  birthday: {
        type: Date,
        required: true
    },
    timezone: {
    type: String,
    required: [true, 'Timezone is required'],
    validate: {
      validator: function(value: string) {
        try {
          // Check if it's a valid IANA timezone identifier
          Intl.DateTimeFormat(undefined, { timeZone: value });
          return true;
        } catch (error) {
          return false;
        }
      },
      message: (props: { value: string; }) => `${props.value} is not a valid timezone identifier`
    }
   },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  versionKey: false // Don't include __v field
});

// Create and export the User model
const User = mongoose.model<UserDocument>('User', userSchema);

export default User;
