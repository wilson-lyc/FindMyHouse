export const locationCategories = ['work', 'school', 'transport', 'common', 'other'] as const;

export type LocationCategory = (typeof locationCategories)[number];

export const locationCategoryLabels: Record<LocationCategory, string> = {
  work: '公司',
  school: '学校',
  transport: '交通',
  common: '常用',
  other: '其他'
};

export interface Location {
  id: string;
  name: string;
  category: LocationCategory;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LocationForm = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;

export interface LocationFilters {
  category: LocationCategory | '';
}
