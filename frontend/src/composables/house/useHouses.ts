import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createHouse, deleteHouse, fetchHouses, updateHouse } from '../../api/house/house-api';
import type { House, HouseFilters, HouseForm } from '../../model/house/house';

export function useHouses() {
  const houses = ref<House[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const filters = reactive<HouseFilters>({
    q: '',
    status: ''
  });

  async function loadHouses() {
    loading.value = true;
    try {
      houses.value = await fetchHouses(filters);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载房源失败');
    } finally {
      loading.value = false;
    }
  }

  async function saveHouse(payload: HouseForm, editingHouse?: House | null) {
    saving.value = true;
    try {
      if (editingHouse) {
        await updateHouse(editingHouse.id, payload);
        ElMessage.success('房源已更新');
      } else {
        await createHouse(payload);
        ElMessage.success('房源已创建');
      }

      await loadHouses();
    } finally {
      saving.value = false;
    }
  }

  async function removeHouse(house: House) {
    await deleteHouse(house.id);
    ElMessage.success('房源已删除');
    await loadHouses();
  }

  return {
    houses,
    loading,
    saving,
    filters,
    loadHouses,
    saveHouse,
    removeHouse
  };
}
