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

    if (filters.q) {
      where.push('(name LIKE @q OR address LIKE @q OR notes LIKE @q)');
      params.q = `%${filters.q}%`;
    }

    const sql = `
      SELECT * FROM locations
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY updated_at DESC
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

    this.database
      .prepare(
        `
          INSERT INTO locations (
            id, name, category, address, latitude, longitude, notes, created_at, updated_at
          ) VALUES (
            @id, @name, @category, @address, @latitude, @longitude, @notes, @created_at, @updated_at
          )
        `
      )
      .run({
        id,
        ...toLocationRowParams(input),
        created_at: now,
        updated_at: now
      });

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

    this.database
      .prepare(
        `
          UPDATE locations SET
            name = @name,
            category = @category,
            address = @address,
            latitude = @latitude,
            longitude = @longitude,
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

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.database.prepare('DELETE FROM locations WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
