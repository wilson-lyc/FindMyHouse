import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { House } from '../model/house/house';

export const useHouseCompareStore = defineStore('houseCompare', () => {
  const visible = ref(false);
  const houses = ref<House[]>([]);

  function open(compareHouses: House[]) {
    houses.value = compareHouses;
    visible.value = true;
  }

  function close() {
    visible.value = false;
  }

  return {
    visible,
    houses,
    open,
    close
  };
});
