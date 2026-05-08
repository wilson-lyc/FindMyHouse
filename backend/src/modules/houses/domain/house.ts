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

export interface House {
  id: string;
  name: string;
  status: HouseStatus;
  bedroomCount: number;
  livingRoomCount: number;
  bathroomCount: number;
  sourceChannel?: HouseSourceChannel;
  sourceChannelName?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rentPrice: number;
  propertyFee?: number;
  waterFeePerTon?: number;
  electricityFeePerKwh?: number;
  otherFee?: number;
  phone?: string;
  wechat?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseFilters {
  status?: HouseStatus;
  sourceChannel?: HouseSourceChannel;
  q?: string;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
}
