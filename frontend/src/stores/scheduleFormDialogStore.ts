import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Schedule } from '../model/schedule/schedule';

export const useScheduleFormDialogStore = defineStore('scheduleFormDialog', () => {
  const visible = ref(false);
  const editingSchedule = ref<Schedule | null>(null);
  const prefillHouseId = ref<string | null>(null);

  function open(schedule?: Schedule) {
    editingSchedule.value = schedule ?? null;
    prefillHouseId.value = null;
    visible.value = true;
  }

  function openWithHouse(houseId: string) {
    editingSchedule.value = null;
    prefillHouseId.value = houseId;
    visible.value = true;
  }

  function close() {
    visible.value = false;
    editingSchedule.value = null;
    prefillHouseId.value = null;
  }

  function setVisible(nextVisible: boolean) {
    if (!nextVisible) {
      close();
      return;
    }

    visible.value = true;
  }

  return {
    visible,
    editingSchedule,
    prefillHouseId,
    open,
    openWithHouse,
    close,
    setVisible
  };
});
