import { env } from '../../config/env.js';

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

export class AmapService {
  async geocode(address: string, city?: string): Promise<GeocodeResult | undefined> {
    if (!env.amapWebServiceKey) {
      throw new Error('AMAP_WEB_SERVICE_KEY is not configured');
    }

    const params = new URLSearchParams({
      key: env.amapWebServiceKey,
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
}
