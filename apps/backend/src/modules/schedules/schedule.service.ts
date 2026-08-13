import type { Schedule, ScheduleFilters, CreateScheduleInput, UpdateScheduleInput } from '@findmyhouse/contracts';
import { type ImportScheduleInput, ScheduleRepository } from './schedule.repository.js';

export class ScheduleService {
  constructor(private readonly repository: ScheduleRepository) {}

  listSchedules(filters: ScheduleFilters): Schedule[] {
    return this.repository.list(filters);
  }

  getSchedule(id: string): Schedule | undefined {
    return this.repository.findById(id);
  }

  createSchedule(input: CreateScheduleInput): Schedule {
    return this.repository.create(input);
  }

  updateSchedule(id: string, input: UpdateScheduleInput): Schedule | undefined {
    return this.repository.update(id, input);
  }

  deleteSchedule(id: string): boolean {
    return this.repository.delete(id);
  }

  importSchedules(schedules: ImportScheduleInput[]): number {
    if (!schedules.length) return 0;
    return this.repository.upsertMany(schedules);
  }
}
