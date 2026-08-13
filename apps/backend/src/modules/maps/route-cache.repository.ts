import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { CommuteDistanceResult, CommuteMode } from '@findmyhouse/contracts';

export type RouteCacheKind = 'distance';

interface RouteCacheRow {
  id: string;
  focus_location_id: string;
  origin: string;
  destination: string;
  kind: RouteCacheKind;
  commute_mode: string;
  distance: number;
  duration: number;
  created_at: string;
  updated_at: string;
}

interface SaveRouteCacheInput {
  focusLocationId: string;
  origin: string;
  destination: string;
  kind: RouteCacheKind;
  commuteMode: CommuteMode;
  distance: number;
  duration: number;
}

export class RouteCacheRepository {
  constructor(private readonly database: DatabaseType) {}

  findDistance(
    focusLocationId: string,
    origin: string,
    destination: string,
    commuteMode: CommuteMode
  ): CommuteDistanceResult | undefined {
    const row = this.find(focusLocationId, origin, destination, 'distance', commuteMode);
    if (!row) return undefined;

    return {
      origin: row.origin,
      destination: row.destination,
      distance: row.distance,
      duration: row.duration,
      mode: commuteMode,
    };
  }

  save(input: SaveRouteCacheInput) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.database
      .prepare(
        `
          INSERT INTO map_route_cache (
            id, focus_location_id, origin, destination, kind, commute_mode, distance, duration, created_at, updated_at
          ) VALUES (
            @id, @focus_location_id, @origin, @destination, @kind, @commute_mode, @distance, @duration, @created_at, @updated_at
          )
          ON CONFLICT(focus_location_id, origin, destination, commute_mode, kind) DO UPDATE SET
            distance = excluded.distance,
            duration = excluded.duration,
            updated_at = excluded.updated_at
        `
      )
      .run({
        id,
        focus_location_id: input.focusLocationId,
        origin: input.origin,
        destination: input.destination,
        kind: input.kind,
        commute_mode: input.commuteMode,
        distance: input.distance,
        duration: input.duration,
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
    kind: RouteCacheKind,
    commuteMode: CommuteMode
  ): RouteCacheRow | undefined {
    return this.database
      .prepare(
        `
          SELECT * FROM map_route_cache
          WHERE focus_location_id = @focus_location_id
            AND origin = @origin
            AND destination = @destination
            AND kind = @kind
            AND commute_mode = @commute_mode
        `
      )
      .get({
        focus_location_id: focusLocationId,
        origin,
        destination,
        kind,
        commute_mode: commuteMode,
      }) as RouteCacheRow | undefined;
  }
}
