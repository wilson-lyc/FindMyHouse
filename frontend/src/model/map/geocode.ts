export type CommuteMode = 'driving' | 'transit' | 'cycling' | 'walking';

export interface GeocodeResult {
  provider: 'amap';
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  city?: string;
  district?: string;
}

export type ReverseGeocodeResult = GeocodeResult;

export interface CommuteDistanceResult {
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  mode: CommuteMode;
}

export interface CommuteRouteResult {
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  polyline?: Array<[number, number]>;
  mode: CommuteMode;
}

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
