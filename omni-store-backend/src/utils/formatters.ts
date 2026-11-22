import { StoreCity } from '../models/Store';

export interface UserResponseShape {
  _id: { toString(): string };
  fullName: string;
  email: string;
  preferredStore: StoreCity;
}

export function formatUserResponse(user: UserResponseShape) {
  return {
    id: user._id.toString(),
    name: user.fullName,
    email: user.email,
    preferredStore: user.preferredStore,
  };
}