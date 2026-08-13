import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { Schedule, ScheduleFilters, CreateScheduleInput, UpdateScheduleInput } from '@findmyhouse/contracts';
import { toSchedule, type ScheduleRow } from './schedule.mapper.js';

export interface ImportScheduleInput {
  id: string;
  houseId: string;
  viewingAt: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ScheduleRepository {
  constructor(private readonly database: DatabaseType) {}

  list(filters: ScheduleFilters = {}): Schedule[] {
    const where: string[] = [];
    const params: Record<string, string> = {};

    if (filters.houseId) {
      where.push('s.house_id = @houseId');
      params.houseId = filters.houseId;
    }

    if (filters.dateFrom) {
      where.push('s.viewing_at >= @dateFrom');
      params.dateFrom = filters.dateFrom;
    }

    if (filters.dateTo) {
      where.push('s.viewing_at <= @dateTo');
      params.dateTo = filters.dateTo;
    }

    const sql = `
      SELECT s.*, h.name AS house_name
      FROM viewing_schedules s
      LEFT JOIN houses h ON h.id = s.house_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.viewing_at ASC
    `;

    const rows = this.database.prepare(sql).all(params) as ScheduleRow[];
    return rows.map(toSchedule);
  }

  findById(id: string): Schedule | undefined {
    const row = this.database
      .prepare(
        `
          SELECT s.*, h.name AS house_name
          FROM viewing_schedules s
          LEFT JOIN houses h ON h.id = s.house_id
          WHERE s.id = ?
        `
      )
      .get(id) as ScheduleRow | undefined;

    if (!row) return undefined;
    return toSchedule(row);
  }

  create(input: CreateScheduleInput): Schedule {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.database
      .prepare(
        `
          INSERT INTO viewing_schedules (id, house_id, viewing_at, note, created_at, updated_at)
          VALUES (@id, @house_id, @viewing_at, @note, @created_at, @updated_at)
        `
      )
      .run({
        id,
        house_id: input.houseId,
        viewing_at: input.viewingAt,
        note: input.note ?? null,
        created_at: now,
        updated_at: now
      });

    return this.findById(id) as Schedule;
  }

  update(id: string, input: UpdateScheduleInput): Schedule | undefined {
    const current = this.findById(id);
    if (!current) return undefined;

    const now = new Date().toISOString();

    this.database
      .prepare(
        `
          UPDATE viewing_schedules SET
            viewing_at = @viewing_at,
            note = @note,
            updated_at = @updated_at
          WHERE id = @id
        `
      )
      .run({
        id,
        viewing_at: input.viewingAt ?? current.viewingAt,
        note: input.note !== undefined ? (input.note ?? null) : (current.note ?? null),
        updated_at: now
      });

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.database.prepare('DELETE FROM viewing_schedules WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteByHouseId(houseId: string): void {
    this.database.prepare('DELETE FROM viewing_schedules WHERE house_id = ?').run(houseId);
  }

  upsertMany(schedules: ImportScheduleInput[]): number {
    const upsert = this.database.prepare(`
      INSERT INTO viewing_schedules (id, house_id, viewing_at, note, created_at, updated_at)
      VALUES (@id, @house_id, @viewing_at, @note, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        house_id = @house_id,
        viewing_at = @viewing_at,
        note = @note,
        updated_at = @updated_at
    `);

    const transaction = this.database.transaction((items: ImportScheduleInput[]) => {
      for (const schedule of items) {
        upsert.run({
          id: schedule.id,
          house_id: schedule.houseId,
          viewing_at: schedule.viewingAt,
          note: schedule.note ?? null,
          created_at: schedule.createdAt,
          updated_at: schedule.updatedAt
        });
      }
    });

    transaction(schedules);
    return schedules.length;
  }

  findByHouseIds(houseIds: string[]): Map<string, Schedule[]> {
    const schedulesByHouseId = new Map<string, Schedule[]>();
    if (!houseIds.length) return schedulesByHouseId;

    const placeholders = houseIds.map((_, index) => `@id${index}`).join(', ');
    const params = Object.fromEntries(houseIds.map((id, index) => [`id${index}`, id]));
    const rows = this.database
      .prepare(
        `
          SELECT s.*, h.name AS house_name
          FROM viewing_schedules s
          LEFT JOIN houses h ON h.id = s.house_id
          WHERE s.house_id IN (${placeholders})
          ORDER BY s.viewing_at ASC
        `
      )
      .all(params) as ScheduleRow[];

    for (const row of rows) {
      const schedules = schedulesByHouseId.get(row.house_id) ?? [];
      schedules.push(toSchedule(row));
      schedulesByHouseId.set(row.house_id, schedules);
    }

    return schedulesByHouseId;
  }
}
