import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createSchedule, deleteSchedule, fetchSchedules, updateSchedule } from '../api/schedule/schedule-api';
import type { Schedule, ScheduleForm } from '../model/schedule/schedule';

export const useScheduleStore = defineStore('schedule', () => {
  const schedules = ref<Schedule[]>([]);
  const loading = ref(false);

  async function loadSchedules(houseId?: string) {
    loading.value = true;
    try {
      schedules.value = await fetchSchedules(houseId);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载日程失败');
    } finally {
      loading.value = false;
    }
  }

  async function addSchedule(payload: ScheduleForm) {
    const schedule = await createSchedule(payload);
    ElMessage.success('日程已添加');
    await loadSchedules();
    return schedule;
  }

  async function editSchedule(id: string, payload: Partial<ScheduleForm>) {
    const schedule = await updateSchedule(id, payload);
    ElMessage.success('日程已更新');
    await loadSchedules();
    return schedule;
  }

  async function removeSchedule(id: string) {
    await deleteSchedule(id);
    ElMessage.success('日程已删除');
    await loadSchedules();
  }

  return {
    schedules,
    loading,
    loadSchedules,
    addSchedule,
    editSchedule,
    removeSchedule
  };
});
