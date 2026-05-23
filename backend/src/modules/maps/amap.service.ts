import { configService } from '../config/index.js';

export type CommuteMode = 'driving' | 'transit' | 'cycling' | 'walking';

interface AmapGeocodeResponse {
  status: string;
  info: string;
  geocodes?: Array<{
    formatted_address: string;
    country: string;
    province: string;
    city: string | string[];
    district: string;
    location: string;
  }>;
}

interface AmapReverseGeocodeResponse {
  status: string;
  info: string;
  regeocode?: {
    formatted_address?: string;
    addressComponent?: {
      province?: string;
      city?: string | string[];
      district?: string;
    };
  };
}

export interface GeocodeResult {
  provider: 'amap';
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  city?: string;
  district?: string;
}

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

function getApiUrl(mode: CommuteMode): string {
  const base = 'https://restapi.amap.com/v3/direction';
  switch (mode) {
    case 'driving': return `${base}/driving`;
    case 'transit': return `${base}/transit/integrated`;
    case 'cycling': return `${base}/bicycling`;
    case 'walking': return `${base}/walking`;
  }
}

export class AmapService {
  async geocode(address: string, city?: string): Promise<GeocodeResult | undefined> {
    const amapKey = configService.getAmapWebServiceKey();
    if (!amapKey) {
      throw new Error('AMAP_WEB_SERVICE_KEY is not configured');
    }

    const params = new URLSearchParams({
      key: amapKey,
      address
    });

    if (city) {
      params.set('city', city);
    }

    const response = await fetch(`https://restapi.amap.com/v3/geocode/geo?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Amap geocode failed with ${response.status}`);
    }

    const payload = (await response.json()) as AmapGeocodeResponse;
    if (payload.status !== '1') {
      throw new Error(payload.info || 'Amap geocode failed');
    }

    const first = payload.geocodes?.[0];
    if (!first?.location) {
      return undefined;
    }

    const [longitude, latitude] = first.location.split(',').map(Number);
    return {
      provider: 'amap',
      formattedAddress: first.formatted_address,
      latitude,
      longitude,
      province: first.province,
      city: Array.isArray(first.city) ? undefined : first.city,
      district: first.district
    };
  }

  async reverseGeocode(longitude: number, latitude: number): Promise<GeocodeResult | undefined> {
    const amapKey = configService.getAmapWebServiceKey();
    if (!amapKey) {
      throw new Error('AMAP_WEB_SERVICE_KEY is not configured');
    }

    const params = new URLSearchParams({
      key: amapKey,
      location: `${longitude},${latitude}`,
      extensions: 'base'
    });

    const response = await fetch(`https://restapi.amap.com/v3/geocode/regeo?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Amap reverse geocode failed with ${response.status}`);
    }

    const payload = (await response.json()) as AmapReverseGeocodeResponse;
    if (payload.status !== '1') {
      throw new Error(payload.info || 'Amap reverse geocode failed');
    }

    const formattedAddress = payload.regeocode?.formatted_address;
    if (!formattedAddress) {
      return undefined;
    }

    const addressComponent = payload.regeocode?.addressComponent;
    return {
      provider: 'amap',
      formattedAddress,
      latitude,
      longitude,
      province: addressComponent?.province,
      city: Array.isArray(addressComponent?.city) ? undefined : addressComponent?.city,
      district: addressComponent?.district
    };
  }

  async getCommuteDistance(
    mode: CommuteMode,
    origin: string,
    destination: string
  ): Promise<CommuteDistanceResult | undefined> {
    const amapKey = configService.getAmapWebServiceKey();
    if (!amapKey) {
      throw new Error('AMAP_WEB_SERVICE_KEY is not configured');
    }

    const params = new URLSearchParams({
      key: amapKey,
      origin,
      destination,
      extensions: 'base'
    });

    const url = getApiUrl(mode);
    const response = await fetch(`${url}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Amap ${mode} direction failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      status: string;
      info: string;
      route?: { paths?: Array<{ distance: string; duration: string }> };
    };
    if (payload.status !== '1') {
      throw new Error(payload.info || `Amap ${mode} direction failed`);
    }

    const path = payload.route?.paths?.[0];
    if (!path) {
      return undefined;
    }

    return {
      origin,
      destination,
      distance: Number(path.distance),
      duration: Number(path.duration),
      mode
    };
  }

  async getCommuteRoute(
    mode: CommuteMode,
    origin: string,
    destination: string
  ): Promise<CommuteRouteResult | undefined> {
    const amapKey = configService.getAmapWebServiceKey();
    if (!amapKey) {
      throw new Error('AMAP_WEB_SERVICE_KEY is not configured');
    }

    const params = new URLSearchParams({
      key: amapKey,
      origin,
      destination,
      extensions: 'all'
    });

    const url = getApiUrl(mode);
    const response = await fetch(`${url}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Amap ${mode} direction failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      status: string;
      info: string;
      route?: {
        paths?: Array<{
          distance: string;
          duration: string;
          steps?: Array<{ polyline?: string }>;
        }>;
      };
    };
    if (payload.status !== '1') {
      throw new Error(payload.info || `Amap ${mode} direction failed`);
    }

    const path = payload.route?.paths?.[0];
    if (!path) {
      return undefined;
    }

    // 公交模式下不提取 polyline（无连续路径）
    let polyline: Array<[number, number]> | undefined;
    if (mode !== 'transit') {
      polyline = [];
      for (const step of path.steps ?? []) {
        if (!step.polyline) continue;
        const points = step.polyline.split(';');
        for (const point of points) {
          const [lng, lat] = point.split(',').map(Number);
          if (!isNaN(lng) && !isNaN(lat)) {
            polyline.push([lng, lat]);
          }
        }
      }
    }

    return {
      origin,
      destination,
      distance: Number(path.distance),
      duration: Number(path.duration),
      polyline,
      mode
    };
  }

  // 向后兼容委托
  async getDrivingDistance(
    origin: string,
    destination: string
  ): Promise<CommuteDistanceResult | undefined> {
    return this.getCommuteDistance('driving', origin, destination);
  }

  async getDrivingRoute(
    origin: string,
    destination: string
  ): Promise<CommuteRouteResult | undefined> {
    return this.getCommuteRoute('driving', origin, destination);
  }
}
