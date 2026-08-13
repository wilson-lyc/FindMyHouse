import type { Schedule } from '@findmyhouse/contracts';

export type { Schedule };

export interface ScheduleForm {
  houseId: string;
  viewingAt: string;
  note?: string;
}
