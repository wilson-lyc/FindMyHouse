export const houseStatuses = [
  'new',
  'shortlisted',
  'contacted',
  'scheduled',
  'visited',
  'rejected',
  'applied',
  'signed'
] as const;

export type HouseStatus = (typeof houseStatuses)[number];

export const housePaymentPeriods = ['monthly', 'quarterly', 'semiannually', 'annually'] as const;

export type HousePaymentPeriod = (typeof housePaymentPeriods)[number];

export interface House {
  id: string;
  title: string;
  source?: string;
  sourceUrl?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rentPrice: number;
  paymentPeriods?: HousePaymentPeriod[];
  depositAmount?: number;
  agencyFee?: number;
  propertyFee?: number;
  waterFeePerTon?: number;
  electricityFeePerKwh?: number;
  internetFee?: number;
  sharedFee?: number;
  otherFee?: number;
  areaSqm?: number;
  layout?: string;
  floor?: string;
  orientation?: string;
  availableDate?: string;
  status: HouseStatus;
  isFavorited: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseFilters {
  status?: HouseStatus;
  q?: string;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
}
