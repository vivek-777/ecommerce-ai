import { Schema, model, models } from 'mongoose';

export type StoreCity = 'hyderabad' | 'bengaluru' | 'mumbai' | 'delhi';

export interface IStore {
  _id: StoreCity;
  name: string;
  cityLabel: string;
  address: string;
}

const StoreSchema = new Schema<IStore>(
  {
    _id: {
      type: String,
      enum: ['hyderabad', 'bengaluru', 'mumbai', 'delhi'],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    cityLabel: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { _id: false, timestamps: true }
);

export const Store = models.Store || model<IStore>('Store', StoreSchema);