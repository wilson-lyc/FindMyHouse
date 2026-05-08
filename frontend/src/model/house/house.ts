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

export const houseSourceChannelLabels: Record<HouseSourceChannel, string> = {
  beike: '贝壳',
  mini_program: '小程序',
  anjuke: '安居客',
  lianjia: '链家',
  offline_agent: '线下中介',
  other: '其他'
};

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

export type HouseForm = Omit<House, 'id' | 'createdAt' | 'updatedAt' | 'rentPrice' | 'sourceChannel'> & {
  rentPrice?: number;
  sourceChannel?: HouseSourceChannel | '' | null;
};

export interface HouseFilters {
  q: string;
  status: HouseStatus | '';
  sourceChannel: HouseSourceChannel | '';
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
}
