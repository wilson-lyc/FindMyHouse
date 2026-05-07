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

export interface Listing {
  id: string;
  title: string;
  source?: string;
  sourceUrl?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rentPrice: number;
  depositAmount?: number;
  agencyFee?: number;
  areaSqm?: number;
  layout?: string;
  floor?: string;
  orientation?: string;
  availableDate?: string;
  status: ListingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ListingForm = Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>;

export interface ListingFilters {
  q: string;
  status: ListingStatus | '';
}
