import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { geocodeSchema, drivingDistanceSchema } from './dto/map.schema.js';
import { AmapService, type DrivingDistanceResult, type DrivingRouteResult } from './amap.service.js';
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

async function getCachedDrivingDistance(
  origin: string,
  destination: string
): Promise<DrivingDistanceResult | undefined> {
  const focusLocation = getMatchingFocusLocation(destination);
  const cached = focusLocation
    ? routeCacheRepository.findDistance(focusLocation.id, origin, destination)
    : undefined;
  if (cached) return cached;

  const result = await amapService.getDrivingDistance(origin, destination);
  if (result && focusLocation) {
    routeCacheRepository.save({
      focusLocationId: focusLocation.id,
      origin,
      destination,
      kind: 'distance',
      distance: result.distance,
      duration: result.duration,
    });
    routeCacheRepository.save({
      focusLocationId: focusLocation.id,
      origin,
      destination,
      kind: 'distance',
      distance: result.distance,
      duration: result.duration,
    });
  }

  return result;
}

async function getCachedDrivingRoute(
  origin: string,
  destination: string
): Promise<DrivingRouteResult | undefined> {
  const focusLocation = getMatchingFocusLocation(destination);
  const cached = focusLocation
    ? routeCacheRepository.findRoute(focusLocation.id, origin, destination)
    : undefined;
  if (cached) return cached;

  const result = await amapService.getDrivingRoute(origin, destination);
  if (result && focusLocation) {
    routeCacheRepository.save({
      focusLocationId: focusLocation.id,
      origin,
      destination,
      kind: 'route',
      distance: result.distance,
      duration: result.duration,
      polyline: result.polyline,
    });
  }

  return result;
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
}
