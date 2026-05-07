export interface GeocodeResult {
  provider: 'amap';
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  city?: string;
  district?: string;
}

export interface MapBoundsFilter {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}
