import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { House } from '../model/house/house';

export const useScheduleDialogStore = defineStore('scheduleDialog', () => {
  const visible = ref(false);
  const house = ref<House | null>(null);
  const addScheduleOnOpen = ref(false);

  function open(houseToSchedule: House, options: { addScheduleOnOpen?: boolean } = {}) {
    house.value = houseToSchedule;
    addScheduleOnOpen.value = options.addScheduleOnOpen ?? false;
    visible.value = true;
  }

  function close() {
    visible.value = false;
    house.value = null;
    addScheduleOnOpen.value = false;
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
    house,
    addScheduleOnOpen,
    open,
    close,
    setVisible
  };
});

