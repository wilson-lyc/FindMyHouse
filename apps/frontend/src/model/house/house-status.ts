import type { HouseStatus } from './house';

export const statusLabels: Record<HouseStatus, string> = {
  watching: '观望中',
  interested: '有意向',
  negotiating: '洽谈中',
  abandoned: '已放弃',
  signed: '已签约'
};

export function statusType(status: HouseStatus) {
  const map: Record<HouseStatus, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    watching: 'info',
    interested: 'primary',
    negotiating: 'warning',
    abandoned: 'danger',
    signed: 'success'
  };

  return map[status];
}
