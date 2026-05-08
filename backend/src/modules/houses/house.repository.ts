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

    if (filters.sourceChannel) {
      where.push('source_channel = @sourceChannel');
      params.sourceChannel = filters.sourceChannel;
    }

    if (filters.q) {
      where.push('(name LIKE @q OR address LIKE @q OR phone LIKE @q OR wechat LIKE @q OR contact_notes LIKE @q)');
      params.q = `%${filters.q}%`;
    }

    filters.keywords?.forEach((keyword, index) => {
      const paramName = `keyword${index}`;
      where.push(`(name LIKE @${paramName} OR address LIKE @${paramName} OR contact_notes LIKE @${paramName})`);
      params[paramName] = `%${keyword}%`;
    });

    if (filters.minRentPrice !== undefined) {
      where.push('rent_price >= @minRentPrice');
      params.minRentPrice = filters.minRentPrice;
    }

    if (filters.maxRentPrice !== undefined) {
      where.push('rent_price <= @maxRentPrice');
      params.maxRentPrice = filters.maxRentPrice;
    }

    if (filters.minBedroomCount !== undefined) {
      where.push('bedroom_count >= @minBedroomCount');
      params.minBedroomCount = filters.minBedroomCount;
    }

    if (filters.maxBedroomCount !== undefined) {
      where.push('bedroom_count <= @maxBedroomCount');
      params.maxBedroomCount = filters.maxBedroomCount;
    }

    if (filters.minLivingRoomCount !== undefined) {
      where.push('living_room_count >= @minLivingRoomCount');
      params.minLivingRoomCount = filters.minLivingRoomCount;
    }

    if (filters.maxLivingRoomCount !== undefined) {
      where.push('living_room_count <= @maxLivingRoomCount');
      params.maxLivingRoomCount = filters.maxLivingRoomCount;
    }

    if (filters.minBathroomCount !== undefined) {
      where.push('bathroom_count >= @minBathroomCount');
      params.minBathroomCount = filters.minBathroomCount;
    }

    if (filters.maxBathroomCount !== undefined) {
      where.push('bathroom_count <= @maxBathroomCount');
      params.maxBathroomCount = filters.maxBathroomCount;
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
      ${filters.limit ? 'LIMIT @limit' : ''}
    `;

    if (filters.limit) {
      params.limit = filters.limit;
    }

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
            id, name, status, bedroom_count, living_room_count, bathroom_count, source_channel,
            address, latitude, longitude, rent_price, rent_payment_periods, property_fee, water_fee_per_ton,
            electricity_fee_per_kwh, other_fee, phone, wechat, contact_notes, created_at, updated_at
          ) VALUES (
            @id, @name, @status, @bedroom_count, @living_room_count, @bathroom_count, @source_channel,
            @address, @latitude, @longitude, @rent_price, @rent_payment_periods, @property_fee, @water_fee_per_ton,
            @electricity_fee_per_kwh, @other_fee, @phone, @wechat, @contact_notes, @created_at, @updated_at
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
            name = @name,
            status = @status,
            bedroom_count = @bedroom_count,
            living_room_count = @living_room_count,
            bathroom_count = @bathroom_count,
            source_channel = @source_channel,
            address = @address,
            latitude = @latitude,
            longitude = @longitude,
            rent_price = @rent_price,
            rent_payment_periods = @rent_payment_periods,
            property_fee = @property_fee,
            water_fee_per_ton = @water_fee_per_ton,
            electricity_fee_per_kwh = @electricity_fee_per_kwh,
            other_fee = @other_fee,
            phone = @phone,
            wechat = @wechat,
            contact_notes = @contact_notes,
            updated_at = @updated_at
          WHERE id = @id
        `
      )
      .run({
        id,
        ...toHouseRowParams(next),
        updated_at: next.updatedAt
      });

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.database.prepare('DELETE FROM houses WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
