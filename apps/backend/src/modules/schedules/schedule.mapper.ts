import type { Schedule } from '@findmyhouse/contracts';

export interface ScheduleRow {
  id: string;
  house_id: string;
  viewing_at: string;
  note: string | null;
  house_name?: string;
  created_at: string;
  updated_at: string;
}

export function toSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    houseId: row.house_id,
    viewingAt: row.viewing_at,
    note: row.note ?? undefined,
    houseName: row.house_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
