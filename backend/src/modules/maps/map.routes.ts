import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { geocodeSchema, reverseGeocodeSchema, drivingDistanceSchema, commuteDistanceSchema, commuteRouteSchema } from './dto/map.schema.js';
import { AmapService, type CommuteDistanceResult, type CommuteRouteResult, type CommuteMode } from './amap.service.js';
import { RouteCacheRepository } from './route-cache.repository.js';
import { LocationRepository } from '../locations/location.repository.js';
import type { Location } from '../locations/domain/location.js';

const amapService = new AmapService();
const routeCacheRepository = new RouteCacheRepository(db);
const locationRepository = new LocationRepository(db);

function coordinatesToParam(longitude: number, latitude: number) {
  return `${longitude},${latitude}`;
}

function getMatchingFocusLocation(destination: string): Location | undefined {
  return locationRepository
    .list()
    .find(
      (location) =>
        location.isFocus &&
        location.longitude !== undefined &&
        location.latitude !== undefined &&
        coordinatesToParam(location.longitude, location.latitude) === destination
    );
}

async function getCachedCommuteDistance(
  mode: CommuteMode,
  origin: string,
  destination: string
): Promise<CommuteDistanceResult | undefined> {
  const focusLocation = getMatchingFocusLocation(destination);
  const cached = focusLocation
    ? routeCacheRepository.findDistance(focusLocation.id, origin, destination, mode)
    : undefined;
  if (cached) return cached;

  const result = await amapService.getCommuteDistance(mode, origin, destination);
  if (result && focusLocation) {
    routeCacheRepository.save({
      focusLocationId: focusLocation.id,
      origin,
      destination,
      kind: 'distance',
      commuteMode: mode,
      distance: result.distance,
      duration: result.duration,
    });
  }

  return result;
}

async function getCachedCommuteRoute(
  mode: CommuteMode,
  origin: string,
  destination: string
): Promise<CommuteRouteResult | undefined> {
  const focusLocation = getMatchingFocusLocation(destination);
  const cached = focusLocation
    ? routeCacheRepository.findRoute(focusLocation.id, origin, destination, mode)
    : undefined;
  if (cached) return cached;

  const result = await amapService.getCommuteRoute(mode, origin, destination);
  if (result && focusLocation) {
    routeCacheRepository.save({
      focusLocationId: focusLocation.id,
      origin,
      destination,
      kind: 'route',
      commuteMode: mode,
      distance: result.distance,
      duration: result.duration,
      polyline: result.polyline,
    });
  }

  return result;
}

async function getCachedDrivingDistance(
  origin: string,
  destination: string
): Promise<CommuteDistanceResult | undefined> {
  return getCachedCommuteDistance('driving', origin, destination);
}

async function getCachedDrivingRoute(
  origin: string,
  destination: string
): Promise<CommuteRouteResult | undefined> {
  return getCachedCommuteRoute('driving', origin, destination);
}

export async function registerMapRoutes(app: FastifyInstance) {
  app.post('/api/maps/geocode', async (request, reply) => {
    const input = geocodeSchema.parse(request.body);
    const result = await amapService.geocode(input.address, input.city);

    if (!result) {
      return reply.code(404).send({ error: 'Address not found' });
    }

    return { data: result };
  });

  app.post('/api/maps/reverse-geocode', async (request, reply) => {
    const input = reverseGeocodeSchema.parse(request.body);
    const result = await amapService.reverseGeocode(input.longitude, input.latitude);

    if (!result) {
      return reply.code(404).send({ error: 'Coordinates not found' });
    }

    return { data: result };
  });

  app.post('/api/maps/driving-distance', async (request, reply) => {
    const input = drivingDistanceSchema.parse(request.body);
    const result = await getCachedDrivingDistance(input.origin, input.destination);

    if (!result) {
      return reply.code(404).send({ error: 'Route not found' });
    }

    return { data: result };
  });

  app.post('/api/maps/driving-route', async (request, reply) => {
    const input = drivingDistanceSchema.parse(request.body);
    const result = await getCachedDrivingRoute(input.origin, input.destination);

    if (!result) {
      return reply.code(404).send({ error: 'Route not found' });
    }

    return { data: result };
  });

  app.post('/api/maps/commute-distance', async (request, reply) => {
    const input = commuteDistanceSchema.parse(request.body);
    const result = await getCachedCommuteDistance(
      input.commuteMode ?? 'driving',
      input.origin,
      input.destination
    );

    if (!result) {
      return reply.code(404).send({ error: 'Route not found' });
    }

    return { data: result };
  });

  app.post('/api/maps/commute-route', async (request, reply) => {
    const input = commuteRouteSchema.parse(request.body);
    const result = await getCachedCommuteRoute(
      input.commuteMode ?? 'driving',
      input.origin,
      input.destination
    );

    if (!result) {
      return reply.code(404).send({ error: 'Route not found' });
    }

    return { data: result };
  });
}
