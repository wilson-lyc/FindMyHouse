import { deleteData, getData, patchData, postData } from '../http';
import type { Schedule, ScheduleForm } from '../../model/schedule/schedule';

export async function fetchSchedules(houseId?: string) {
  const suffix = houseId ? `?houseId=${houseId}` : '';
  return getData<Schedule[]>(`/api/schedules${suffix}`);
}

export function createSchedule(payload: ScheduleForm) {
  return postData<Schedule, ScheduleForm>('/api/schedules', payload);
}

export function updateSchedule(id: string, payload: Partial<ScheduleForm>) {
  return patchData<Schedule, Partial<ScheduleForm>>(`/api/schedules/${id}`, payload);
}

export function deleteSchedule(id: string) {
  return deleteData(`/api/schedules/${id}`);
}
