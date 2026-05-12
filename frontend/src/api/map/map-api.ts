import { postData } from '../http';
import type { GeocodeResult, DrivingDistanceResult, DrivingRouteResult } from '../../model/map/geocode';

export function geocodeAddress(address: string, city?: string) {
  return postData<GeocodeResult, { address: string; city?: string }>('/api/maps/geocode', { address, city });
}

export function getDrivingDistance(origin: string, destination: string) {
  return postData<DrivingDistanceResult, { origin: string; destination: string }>(
    '/api/maps/driving-distance',
    { origin, destination }
  );
}

export function getDrivingRoute(origin: string, destination: string) {
  return postData<DrivingRouteResult, { origin: string; destination: string }>(
    '/api/maps/driving-route',
    { origin, destination }
  );
}
