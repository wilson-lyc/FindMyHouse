import { postData } from '../http';
import type {
  GeocodeResult,
  ReverseGeocodeResult,
  DrivingDistanceResult,
  DrivingRouteResult,
  CommuteDistanceResult,
  CommuteRouteResult,
  CommuteMode,
  IsochroneResult
} from '../../model/map/geocode';

export function geocodeAddress(address: string, city?: string) {
  return postData<GeocodeResult, { address: string; city?: string }>('/api/maps/geocode', { address, city });
}

export function reverseGeocodeCoordinates(longitude: number, latitude: number) {
  return postData<ReverseGeocodeResult, { longitude: number; latitude: number }>(
    '/api/maps/reverse-geocode',
    { longitude, latitude }
  );
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

export function getCommuteDistance(origin: string, destination: string, commuteMode: CommuteMode) {
  return postData<CommuteDistanceResult, { origin: string; destination: string; commuteMode: CommuteMode }>(
    '/api/maps/commute-distance',
    { origin, destination, commuteMode }
  );
}

export function getCommuteRoute(origin: string, destination: string, commuteMode: CommuteMode) {
  return postData<CommuteRouteResult, { origin: string; destination: string; commuteMode: CommuteMode }>(
    '/api/maps/commute-route',
    { origin, destination, commuteMode }
  );
}

export function getTransitIsochrone(longitude: number, latitude: number, minutes = [10, 20, 30]) {
  return postData<
    IsochroneResult,
    { longitude: number; latitude: number; commuteMode: 'transit'; minutes: number[] }
  >('/api/maps/isochrone', {
    longitude,
    latitude,
    commuteMode: 'transit',
    minutes
  });
}
