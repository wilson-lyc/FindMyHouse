import type { Location, LocationCategory, LocationFilters as ContractLocationFilters } from '@findmyhouse/contracts';
import { locationCategories } from '@findmyhouse/contracts';

export { locationCategories };
export type { Location, LocationCategory };

export const locationCategoryLabels: Record<LocationCategory, string> = {
  work: '公司',
  school: '学校',
  transport: '交通',
  common: '常用',
  other: '其他'
};

export type LocationForm = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;

export interface LocationFilters {
  category: LocationCategory | '';
}

// 保留契约中的查询筛选结构以备后端查询使用
export type { ContractLocationFilters };
