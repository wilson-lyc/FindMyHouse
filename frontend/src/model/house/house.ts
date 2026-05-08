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

export const rentPaymentPeriods = ['monthly', 'quarterly', 'semiannually', 'annually'] as const;

export type RentPaymentPeriod = (typeof rentPaymentPeriods)[number];

export const rentPaymentPeriodLabels: Record<RentPaymentPeriod, string> = {
  monthly: '月付',
  quarterly: '季付',
  semiannually: '半年付',
  annually: '年付'
};

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

export type HouseForm = Omit<House, 'id' | 'createdAt' | 'updatedAt' | 'rentPrice' | 'sourceChannel'> & {
  rentPrice?: number;
  sourceChannel?: HouseSourceChannel | '' | null;
};

export interface HouseFilters {
  q: string;
  status: HouseStatus | '';
  sourceChannel: HouseSourceChannel | '';
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

export type HouseAgentSearchFilters = Partial<Omit<HouseFilters, 'status' | 'sourceChannel'>> & {
  status?: HouseStatus;
  sourceChannel?: HouseSourceChannel;
};

export interface HouseAgentSearchResult {
  query: string;
  filters: HouseAgentSearchFilters;
  explanation?: string;
  steps: string[];
  houses: House[];
}
