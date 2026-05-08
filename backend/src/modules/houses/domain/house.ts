export const houseStatuses = [
  'watching',
  'interested',
  'negotiating',
  'abandoned',
  'signed'
] as const;

export type HouseStatus = (typeof houseStatuses)[number];

export const houseSourceChannels = ['beike', 'mini_program', 'anjuke', 'lianjia', 'offline_agent', 'other'] as const;

export type HouseSourceChannel = (typeof houseSourceChannels)[number];

export const rentPaymentPeriods = ['monthly', 'quarterly', 'semiannually', 'annually'] as const;

export type RentPaymentPeriod = (typeof rentPaymentPeriods)[number];

export interface House {
  id: string;
  name: string;
  status: HouseStatus;
  bedroomCount: number;
  livingRoomCount: number;
  bathroomCount: number;
  sourceChannel?: HouseSourceChannel;
  address: string;
  latitude?: number;
  longitude?: number;
  rentPrice: number;
  rentPaymentPeriods?: RentPaymentPeriod[];
  propertyFee?: number;
  waterFeePerTon?: number;
  electricityFeePerKwh?: number;
  otherFee?: number;
  phone?: string;
  wechat?: string;
  contactNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseFilters {
  status?: HouseStatus;
  sourceChannel?: HouseSourceChannel;
  q?: string;
  keywords?: string[];
  minRentPrice?: number;
  maxRentPrice?: number;
  minBedroomCount?: number;
  maxBedroomCount?: number;
  minLivingRoomCount?: number;
  maxLivingRoomCount?: number;
  minBathroomCount?: number;
  maxBathroomCount?: number;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
  limit?: number;
}
