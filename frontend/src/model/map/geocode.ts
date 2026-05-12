export interface GeocodeResult {
  provider: 'amap';
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  city?: string;
  district?: string;
}

export interface DrivingDistanceResult {
  origin: string;
  destination: string;
  distance: number;
  duration: number;
}

export interface DrivingRouteResult {
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  polyline: Array<[number, number]>;
}

export interface MapBoundsFilter {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}
