import { postData } from '../http';
import type { GeocodeResult } from '../../model/map/geocode';

export function geocodeAddress(address: string, city?: string) {
  return postData<GeocodeResult, { address: string; city?: string }>('/api/maps/geocode', { address, city });
}
