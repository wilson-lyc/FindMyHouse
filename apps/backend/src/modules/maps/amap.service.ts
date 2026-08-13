import { configService } from '../config/index.js';
import type { CommuteMode, GeocodeResult, CommuteDistanceResult, CommuteRouteResult, IsochroneRing, IsochroneResult } from '@findmyhouse/contracts';

export type { CommuteMode, GeocodeResult, CommuteDistanceResult, CommuteRouteResult, IsochroneRing, IsochroneResult };

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

// 类型已从 @findmyhouse/contracts 导入并 re-export（见文件顶部）。
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

function coordinatesToParam(longitude: number, latitude: number) {
  return `${longitude},${latitude}`;
}

function destinationByDistance(
  origin: [number, number],
  distanceMeters: number,
  bearingDegrees: number
): [number, number] {
  const earthRadius = 6378137;
  const angularDistance = distanceMeters / earthRadius;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (origin[1] * Math.PI) / 180;
  const lng1 = (origin[0] * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
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

    if (mode === 'transit') {
      params.set('city', '全国');
    }

    const url = getApiUrl(mode);
    const response = await fetch(`${url}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Amap ${mode} direction failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      status: string;
      info: string;
      route?: {
        paths?: Array<{ distance: string; duration: string }>;
        transits?: Array<{ distance: string; duration: string }>;
      };
    };
    if (payload.status !== '1') {
      throw new Error(payload.info || `Amap ${mode} direction failed`);
    }

    const path = mode === 'transit' ? payload.route?.transits?.[0] : payload.route?.paths?.[0];
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

    if (mode === 'transit') {
      params.set('city', '全国');
    }

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
        transits?: Array<{
          distance: string;
          duration: string;
        }>;
      };
    };
    if (payload.status !== '1') {
      throw new Error(payload.info || `Amap ${mode} direction failed`);
    }

    if (mode === 'transit') {
      const transit = payload.route?.transits?.[0];
      if (!transit) return undefined;

      return {
        origin,
        destination,
        distance: Number(transit.distance),
        duration: Number(transit.duration),
        mode
      };
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

  async getTransitIsochrone(
    longitude: number,
    latitude: number,
    minutes: number[]
  ): Promise<IsochroneResult> {
    const center: [number, number] = [longitude, latitude];
    const centerParam = coordinatesToParam(longitude, latitude);
    const bearings = Array.from({ length: 12 }, (_, index) => index * 30);
    const rings: IsochroneRing[] = [];

    for (const minute of minutes) {
      const targetSeconds = minute * 60;
      const maxRadius = minute * 1000;
      const path = await mapWithConcurrency(bearings, 4, async (bearing) => {
        let low = maxRadius * 0.2;
        let high = maxRadius;

        for (let step = 0; step < 3; step += 1) {
          const mid = (low + high) / 2;
          const originPoint = destinationByDistance(center, mid, bearing);
          const origin = coordinatesToParam(originPoint[0], originPoint[1]);
          const result = await this.getCommuteDistance('transit', origin, centerParam).catch(() => undefined);

          if (result?.duration !== undefined && result.duration <= targetSeconds) {
            low = mid;
          } else {
            high = mid;
          }
        }

        return destinationByDistance(center, low, bearing);
      });

      rings.push({ minutes: minute, path });
    }

    return {
      center,
      mode: 'transit',
      rings
    };
  }
}
