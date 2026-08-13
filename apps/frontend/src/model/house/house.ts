import type {
  House as ContractHouse,
  HouseImageItem,
  HouseStatus,
  HouseSourceChannel,
  RentPaymentPeriod,
  CustomFeeItem,
  ViewingScheduleItem
} from '@findmyhouse/contracts';
import { houseStatuses, houseSourceChannels, rentPaymentPeriods } from '@findmyhouse/contracts';

export { houseStatuses, houseSourceChannels, rentPaymentPeriods };
export type { HouseStatus, HouseSourceChannel, RentPaymentPeriod, CustomFeeItem, ViewingScheduleItem };

export const houseSourceChannelLabels: Record<HouseSourceChannel, string> = {
  beike: '贝壳',
  mini_program: '小程序',
  anjuke: '安居客',
  lianjia: '链家',
  offline_agent: '线下中介',
  other: '其他'
};

export const rentPaymentPeriodLabels: Record<RentPaymentPeriod, string> = {
  monthly: '月付',
  quarterly: '季付',
  semiannually: '半年付',
  annually: '年付'
};

/** 房源图片实体(在契约 HouseImageItem 基础上补充前端展示字段)。 */
export interface HouseImage extends HouseImageItem {
  thumbnailUrl?: string;
  fileName?: string;
}

/** 看房日程单项(前端表单用)。 */
export interface ViewingSchedule {
  id: string;
  viewingAt: string;
  note?: string;
}

/** 房源实体(响应 DTO)。 */
export interface House extends ContractHouse {
  images?: HouseImage[];
}

export type HouseForm = Omit<
  House,
  'id' | 'createdAt' | 'updatedAt' | 'rentPrice' | 'sourceChannel' | 'viewingSchedules'
> & {
  rentPrice?: number;
  sourceChannel?: HouseSourceChannel | '' | null;
  viewingSchedules?: ViewingSchedule[];
};

export interface HouseFilters {
  status: HouseStatus | '';
  sourceChannel: HouseSourceChannel | '';
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
