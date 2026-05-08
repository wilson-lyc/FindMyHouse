import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createHouse, deleteHouse, fetchHouses, searchHousesWithOpenAi, updateHouse } from '../../api/house/house-api';
import type { House, HouseAgentSearchResult, HouseFilters, HouseForm } from '../../model/house/house';

export function useHouses() {
  const houses = ref<House[]>([]);
  const loading = ref(false);
  const aiSearching = ref(false);
  const aiSearchPlan = ref<HouseAgentSearchResult | null>(null);
  const saving = ref(false);
  const filters = reactive<HouseFilters>({
    q: '',
    status: '',
    sourceChannel: ''
  });

  async function loadHouses() {
    loading.value = true;
    try {
      houses.value = await fetchHouses(filters);
      aiSearchPlan.value = null;
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载房源失败');
    } finally {
      loading.value = false;
    }
  }

  async function aiSearchHouses(query: string) {
    aiSearching.value = true;
    loading.value = true;
    try {
      const result = await searchHousesWithOpenAi(query);
      houses.value = result.houses;
      aiSearchPlan.value = result;
      filters.q = '';
      filters.status = result.filters.status ?? '';
      filters.sourceChannel = result.filters.sourceChannel ?? '';
      ElMessage.success('AI 搜索已完成');
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : 'AI 搜索失败');
    } finally {
      aiSearching.value = false;
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
    aiSearching,
    aiSearchPlan,
    saving,
    filters,
    loadHouses,
    aiSearchHouses,
    saveHouse,
    removeHouse
  };
}
