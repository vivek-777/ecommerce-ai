import { Schema, model, models } from 'mongoose';
import { StoreCity } from './Store';

export interface IUser {
  fullName: string;
  email: string;
  passwordHash: string;
  preferredStore: StoreCity;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    preferredStore: {
      type: String,
      enum: ['hyderabad', 'bengaluru', 'mumbai', 'delhi'],
      default: 'bengaluru',
    },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>('User', UserSchema);