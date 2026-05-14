import { configService } from '../config/index.js';

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

  async getDrivingDistance(
    origin: string,
    destination: string
  ): Promise<DrivingDistanceResult | undefined> {
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

    const response = await fetch(
      `https://restapi.amap.com/v3/direction/driving?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`Amap driving direction failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      status: string;
      info: string;
      route?: { paths?: Array<{ distance: string; duration: string }> };
    };
    if (payload.status !== '1') {
      throw new Error(payload.info || 'Amap driving direction failed');
    }

    const path = payload.route?.paths?.[0];
    if (!path) {
      return undefined;
    }

    return {
      origin,
      destination,
      distance: Number(path.distance),
      duration: Number(path.duration)
    };
  }

  async getDrivingRoute(
    origin: string,
    destination: string
  ): Promise<DrivingRouteResult | undefined> {
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

    const response = await fetch(
      `https://restapi.amap.com/v3/direction/driving?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`Amap driving direction failed with ${response.status}`);
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
      throw new Error(payload.info || 'Amap driving direction failed');
    }

    const path = payload.route?.paths?.[0];
    if (!path) {
      return undefined;
    }

    const polyline: Array<[number, number]> = [];
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

    return {
      origin,
      destination,
      distance: Number(path.distance),
      duration: Number(path.duration),
      polyline
    };
  }
}
