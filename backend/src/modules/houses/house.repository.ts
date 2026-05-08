import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { House, HouseFilters } from './domain/house.js';
import type { CreateHouseInput, UpdateHouseInput } from './dto/house.schema.js';
import { toHouse, toHouseRowParams, type HouseRow } from './house.mapper.js';

export class HouseRepository {
  constructor(private readonly database: DatabaseType) {}

  list(filters: HouseFilters = {}): House[] {
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
      SELECT * FROM houses
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY updated_at DESC
    `;

    return this.database.prepare(sql).all(params).map((row) => toHouse(row as HouseRow));
  }

  findById(id: string): House | undefined {
    const row = this.database.prepare('SELECT * FROM houses WHERE id = ?').get(id) as HouseRow | undefined;
    return row ? toHouse(row) : undefined;
  }

  create(input: CreateHouseInput): House {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.database
      .prepare(
        `
          INSERT INTO houses (
            id, title, source, source_url, address, latitude, longitude,
            rent_price, payment_periods, deposit_amount, agency_fee, property_fee, water_fee_per_ton,
            electricity_fee_per_kwh, internet_fee, shared_fee, other_fee, area_sqm,
            layout, floor, orientation, available_date, is_favorited, status, notes, created_at, updated_at
          ) VALUES (
            @id, @title, @source, @source_url, @address, @latitude, @longitude,
            @rent_price, @payment_periods, @deposit_amount, @agency_fee, @property_fee, @water_fee_per_ton,
            @electricity_fee_per_kwh, @internet_fee, @shared_fee, @other_fee, @area_sqm,
            @layout, @floor, @orientation, @available_date, 0, @status, @notes, @created_at, @updated_at
          )
        `
      )
      .run({
        id,
        ...toHouseRowParams(input),
        created_at: now,
        updated_at: now
      });

    return this.findById(id) as House;
  }

  update(id: string, input: UpdateHouseInput): House | undefined {
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
          UPDATE houses SET
            title = @title,
            source = @source,
            source_url = @source_url,
            address = @address,
            latitude = @latitude,
            longitude = @longitude,
            rent_price = @rent_price,
            payment_periods = @payment_periods,
            deposit_amount = @deposit_amount,
            agency_fee = @agency_fee,
            property_fee = @property_fee,
            water_fee_per_ton = @water_fee_per_ton,
            electricity_fee_per_kwh = @electricity_fee_per_kwh,
            internet_fee = @internet_fee,
            shared_fee = @shared_fee,
            other_fee = @other_fee,
            area_sqm = @area_sqm,
            layout = @layout,
            floor = @floor,
            orientation = @orientation,
            available_date = @available_date,
            is_favorited = @is_favorited,
            status = @status,
            notes = @notes,
            updated_at = @updated_at
          WHERE id = @id
        `
      )
      .run({
        id,
        ...toHouseRowParams(next),
        is_favorited: next.isFavorited ? 1 : 0,
        updated_at: next.updatedAt
      });

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.database.prepare('DELETE FROM houses WHERE id = ?').run(id);
    return result.changes > 0;
  }

  toggleFavorite(id: string, isFavorited: boolean): House | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    this.database
      .prepare('UPDATE houses SET is_favorited = ?, updated_at = ? WHERE id = ?')
      .run(isFavorited ? 1 : 0, new Date().toISOString(), id);

    return this.findById(id);
  }
}
