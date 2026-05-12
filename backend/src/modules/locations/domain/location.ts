export const locationCategories = ['work', 'school', 'transport', 'common', 'other'] as const;

export type LocationCategory = (typeof locationCategories)[number];

export interface Location {
  id: string;
  name: string;
  category: LocationCategory;
  address: string;
  latitude?: number;
  longitude?: number;
  isFocus: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationFilters {
  q?: string;
  category?: LocationCategory;
}
