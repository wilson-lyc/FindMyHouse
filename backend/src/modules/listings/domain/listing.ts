export const listingStatuses = [
  'new',
  'shortlisted',
  'contacted',
  'scheduled',
  'visited',
  'rejected',
  'applied',
  'signed'
] as const;

export type ListingStatus = (typeof listingStatuses)[number];

export const listingPaymentPeriods = ['monthly', 'quarterly', 'semiannually', 'annually'] as const;

export type ListingPaymentPeriod = (typeof listingPaymentPeriods)[number];

export interface Listing {
  id: string;
  title: string;
  source?: string;
  sourceUrl?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rentPrice: number;
  paymentPeriods?: ListingPaymentPeriod[];
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
  status: ListingStatus;
  isFavorited: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListingFilters {
  status?: ListingStatus;
  q?: string;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
}
