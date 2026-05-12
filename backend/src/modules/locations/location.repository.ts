import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { Location, LocationFilters } from './domain/location.js';
import type { CreateLocationInput, UpdateLocationInput } from './dto/location.schema.js';
import { toLocation, toLocationRowParams, type LocationRow } from './location.mapper.js';

export class LocationRepository {
  constructor(private readonly database: DatabaseType) {}

  list(filters: LocationFilters = {}): Location[] {
    const where: string[] = [];
    const params: Record<string, string> = {};

    if (filters.category) {
      where.push('category = @category');
      params.category = filters.category;
    }

    const sql = `
      SELECT * FROM locations
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY is_focus DESC, updated_at DESC
    `;

    return this.database.prepare(sql).all(params).map((row) => toLocation(row as LocationRow));
  }

  findById(id: string): Location | undefined {
    const row = this.database.prepare('SELECT * FROM locations WHERE id = ?').get(id) as LocationRow | undefined;
    return row ? toLocation(row) : undefined;
  }

  create(input: CreateLocationInput): Location {
    const id = randomUUID();
    const now = new Date().toISOString();

    const createLocation = this.database.transaction(() => {
      if (input.isFocus) {
        this.clearFocus();
      }

      this.database
        .prepare(
          `
            INSERT INTO locations (
              id, name, category, address, latitude, longitude, is_focus, notes, created_at, updated_at
            ) VALUES (
              @id, @name, @category, @address, @latitude, @longitude, @is_focus, @notes, @created_at, @updated_at
            )
          `
        )
        .run({
          id,
          ...toLocationRowParams(input),
          created_at: now,
          updated_at: now
        });
    });

    createLocation();

    return this.findById(id) as Location;
  }

  update(id: string, input: UpdateLocationInput): Location | undefined {
    const current = this.findById(id);
    if (!current) {
      return undefined;
    }

    const next = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString()
    };

    const updateLocation = this.database.transaction(() => {
      if (next.isFocus) {
        this.clearFocus(id);
      }

      this.database
        .prepare(
          `
            UPDATE locations SET
              name = @name,
              category = @category,
              address = @address,
              latitude = @latitude,
              longitude = @longitude,
              is_focus = @is_focus,
              notes = @notes,
              updated_at = @updated_at
            WHERE id = @id
          `
        )
        .run({
          id,
          ...toLocationRowParams(next),
          updated_at: next.updatedAt
        });
    });

    updateLocation();

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.database.prepare('DELETE FROM locations WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private clearFocus(exceptId?: string) {
    if (exceptId) {
      this.database.prepare('UPDATE locations SET is_focus = 0 WHERE id != ?').run(exceptId);
      return;
    }

    this.database.prepare('UPDATE locations SET is_focus = 0').run();
  }
}
