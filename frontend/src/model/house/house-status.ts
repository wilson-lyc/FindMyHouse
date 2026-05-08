import type { HouseStatus } from './house';

export const statusLabels: Record<HouseStatus, string> = {
  new: '新房源',
  shortlisted: '已收藏',
  contacted: '已联系',
  scheduled: '已约看',
  visited: '已看房',
  rejected: '已淘汰',
  applied: '已申请',
  signed: '已签约'
};

export function statusType(status: HouseStatus) {
  const map: Record<HouseStatus, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    new: 'info',
    shortlisted: 'success',
    contacted: 'primary',
    scheduled: 'warning',
    visited: 'primary',
    rejected: 'danger',
    applied: 'warning',
    signed: 'success'
  };

  return map[status];
}
