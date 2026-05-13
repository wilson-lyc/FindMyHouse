import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { DrivingDistanceResult, DrivingRouteResult } from './amap.service.js';

export type RouteCacheKind = 'distance' | 'route';

interface RouteCacheRow {
  id: string;
  focus_location_id: string;
  origin: string;
  destination: string;
  kind: RouteCacheKind;
  distance: number;
  duration: number;
  polyline?: string | null;
  created_at: string;
  updated_at: string;
}

interface SaveRouteCacheInput {
  focusLocationId: string;
  origin: string;
  destination: string;
  kind: RouteCacheKind;
  distance: number;
  duration: number;
  polyline?: Array<[number, number]>;
}

export class RouteCacheRepository {
  constructor(private readonly database: DatabaseType) {}

  findDistance(
    focusLocationId: string,
    origin: string,
    destination: string
  ): DrivingDistanceResult | undefined {
    const row = this.find(focusLocationId, origin, destination, 'distance');
    if (!row) return undefined;

    return {
      origin: row.origin,
      destination: row.destination,
      distance: row.distance,
      duration: row.duration,
    };
  }

  findRoute(
    focusLocationId: string,
    origin: string,
    destination: string
  ): DrivingRouteResult | undefined {
    const row = this.find(focusLocationId, origin, destination, 'route');
    if (!row) return undefined;

    return {
      origin: row.origin,
      destination: row.destination,
      distance: row.distance,
      duration: row.duration,
      polyline: row.polyline ? (JSON.parse(row.polyline) as Array<[number, number]>) : [],
    };
  }

  save(input: SaveRouteCacheInput) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.database
      .prepare(
        `
          INSERT INTO map_route_cache (
            id, focus_location_id, origin, destination, kind, distance, duration, polyline, created_at, updated_at
          ) VALUES (
            @id, @focus_location_id, @origin, @destination, @kind, @distance, @duration, @polyline, @created_at, @updated_at
          )
          ON CONFLICT(focus_location_id, origin, destination, kind) DO UPDATE SET
            distance = excluded.distance,
            duration = excluded.duration,
            polyline = excluded.polyline,
            updated_at = excluded.updated_at
        `
      )
      .run({
        id,
        focus_location_id: input.focusLocationId,
        origin: input.origin,
        destination: input.destination,
        kind: input.kind,
        distance: input.distance,
        duration: input.duration,
        polyline: input.polyline ? JSON.stringify(input.polyline) : null,
        created_at: now,
        updated_at: now,
      });
  }

  clearAll() {
    this.database.prepare('DELETE FROM map_route_cache').run();
  }

  private find(
    focusLocationId: string,
    origin: string,
    destination: string,
    kind: RouteCacheKind
  ): RouteCacheRow | undefined {
    return this.database
      .prepare(
        `
          SELECT * FROM map_route_cache
          WHERE focus_location_id = @focus_location_id
            AND origin = @origin
            AND destination = @destination
            AND kind = @kind
        `
      )
      .get({
        focus_location_id: focusLocationId,
        origin,
        destination,
        kind,
      }) as RouteCacheRow | undefined;
  }
}
