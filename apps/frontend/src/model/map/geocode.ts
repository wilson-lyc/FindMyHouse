import type {
  CommuteMode,
  GeocodeResult,
  CommuteDistanceResult,
  CommuteRouteResult,
  IsochroneRing,
  IsochroneResult
} from '@findmyhouse/contracts';
import { commuteModes } from '@findmyhouse/contracts';

export {
  commuteModes
};
export type {
  CommuteMode,
  GeocodeResult,
  CommuteDistanceResult,
  CommuteRouteResult,
  IsochroneRing,
  IsochroneResult
};

export type ReverseGeocodeResult = GeocodeResult;

// 向后兼容别名
export type DrivingDistanceResult = CommuteDistanceResult;
export type DrivingRouteResult = CommuteRouteResult;

export interface MapBoundsFilter {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export const commuteModeLabels: Record<CommuteMode, string> = {
  driving: '驾车',
  transit: '公交/地铁',
  cycling: '骑行',
  walking: '步行'
};

export const commuteModeColors: Record<CommuteMode, string> = {
  driving: '#409EFF',
  transit: '#67C23A',
  cycling: '#E6A23C',
  walking: '#F56C6C'
};
