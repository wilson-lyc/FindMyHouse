import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Schedule } from '../model/schedule/schedule';

export const useScheduleFormDialogStore = defineStore('scheduleFormDialog', () => {
  const visible = ref(false);
  const editingSchedule = ref<Schedule | null>(null);

  function open(schedule?: Schedule) {
    editingSchedule.value = schedule ?? null;
    visible.value = true;
  }

  function close() {
    visible.value = false;
    editingSchedule.value = null;
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
    open,
    close,
    setVisible
  };
});
