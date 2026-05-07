import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { Listing, ListingFilters } from './domain/listing.js';
import type { CreateListingInput, UpdateListingInput } from './dto/listing.schema.js';
import { toListing, toListingRowParams, type ListingRow } from './listing.mapper.js';

export class ListingRepository {
  constructor(private readonly database: DatabaseType) {}

  list(filters: ListingFilters = {}): Listing[] {
    const where: string[] = [];
    const params: Record<string, number | string> = {};

    if (filters.status) {
      where.push('status = @status');
      params.status = filters.status;
    }

    if (filters.q) {
      where.push('(title LIKE @q OR address LIKE @q OR notes LIKE @q)');
      params.q = `%${filters.q}%`;
    }

    if (filters.minLatitude !== undefined && filters.maxLatitude !== undefined) {
      where.push('latitude BETWEEN @minLatitude AND @maxLatitude');
      params.minLatitude = filters.minLatitude;
      params.maxLatitude = filters.maxLatitude;
    }

    if (filters.minLongitude !== undefined && filters.maxLongitude !== undefined) {
      where.push('longitude BETWEEN @minLongitude AND @maxLongitude');
      params.minLongitude = filters.minLongitude;
      params.maxLongitude = filters.maxLongitude;
    }

    const sql = `
      SELECT * FROM listings
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY updated_at DESC
    `;

    return this.database.prepare(sql).all(params).map((row) => toListing(row as ListingRow));
  }

  findById(id: string): Listing | undefined {
    const row = this.database.prepare('SELECT * FROM listings WHERE id = ?').get(id) as ListingRow | undefined;
    return row ? toListing(row) : undefined;
  }

  create(input: CreateListingInput): Listing {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.database
      .prepare(
        `
          INSERT INTO listings (
            id, title, source, source_url, address, latitude, longitude,
            rent_price, deposit_amount, agency_fee, area_sqm, layout, floor,
            orientation, available_date, status, notes, created_at, updated_at
          ) VALUES (
            @id, @title, @source, @source_url, @address, @latitude, @longitude,
            @rent_price, @deposit_amount, @agency_fee, @area_sqm, @layout, @floor,
            @orientation, @available_date, @status, @notes, @created_at, @updated_at
          )
        `
      )
      .run({
        id,
        ...toListingRowParams(input),
        created_at: now,
        updated_at: now
      });

    return this.findById(id) as Listing;
  }

  update(id: string, input: UpdateListingInput): Listing | undefined {
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
          UPDATE listings SET
            title = @title,
            source = @source,
            source_url = @source_url,
            address = @address,
            latitude = @latitude,
            longitude = @longitude,
            rent_price = @rent_price,
            deposit_amount = @deposit_amount,
            agency_fee = @agency_fee,
            area_sqm = @area_sqm,
            layout = @layout,
            floor = @floor,
            orientation = @orientation,
            available_date = @available_date,
            status = @status,
            notes = @notes,
            updated_at = @updated_at
          WHERE id = @id
        `
      )
      .run({
        id,
        ...toListingRowParams(next),
        updated_at: next.updatedAt
      });

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.database.prepare('DELETE FROM listings WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
