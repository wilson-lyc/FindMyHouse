import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createLocation, deleteLocation, fetchLocations, updateLocation } from '../api/locations-api';
import { normalizeLocationForm } from '../lib/location-form';
import type { Location, LocationFilters, LocationForm } from '../model/location';

export function useLocations() {
  const locations = ref<Location[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const filters = reactive<LocationFilters>({
    q: '',
    category: ''
  });

  async function loadLocations() {
    loading.value = true;
    try {
      locations.value = await fetchLocations(filters);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载地点失败');
    } finally {
      loading.value = false;
    }
  }

  async function saveLocation(form: LocationForm, editingLocation?: Location | null) {
    saving.value = true;
    try {
      const payload = normalizeLocationForm(form);
      if (editingLocation) {
        await updateLocation(editingLocation.id, payload);
        ElMessage.success('地点已更新');
      } else {
        await createLocation(payload);
        ElMessage.success('地点已创建');
      }

      await loadLocations();
    } finally {
      saving.value = false;
    }
  }

  async function removeLocation(location: Location) {
    await deleteLocation(location.id);
    ElMessage.success('地点已删除');
    await loadLocations();
  }

  return {
    locations,
    loading,
    saving,
    filters,
    loadLocations,
    saveLocation,
    removeLocation
  };
}
