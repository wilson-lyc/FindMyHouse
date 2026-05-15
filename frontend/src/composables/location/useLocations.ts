import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createLocation, deleteLocation, fetchLocations, setFocusLocation as setFocusLocationApi, updateLocation } from '../../api/location/location-api';
import { normalizeLocationForm } from '../../lib/location/location-form';
import type { Location, LocationFilters, LocationForm } from '../../model/location/location';

export function useLocations() {
  const locations = ref<Location[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const filters = reactive<LocationFilters>({
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

  async function saveLocation(form: LocationForm, editingLocation?: Location | null): Promise<Location | undefined> {
    saving.value = true;
    try {
      const payload = normalizeLocationForm(form);
      let saved: Location | undefined;

      if (editingLocation) {
        saved = await updateLocation(editingLocation.id, payload);
        ElMessage.success('地点已更新');
      } else {
        saved = await createLocation(payload);
        ElMessage.success('地点已创建');
      }

      await loadLocations();
      return saved;
    } finally {
      saving.value = false;
    }
  }

  async function removeLocation(location: Location) {
    await deleteLocation(location.id);
    ElMessage.success('地点已删除');
    await loadLocations();
  }

  async function setLocationFocus(location: Location) {
    saving.value = true;
    try {
      await setFocusLocationApi(location.id);
      ElMessage.success(`已将「${location.name}」设为焦点地点`);
      await loadLocations();
    } finally {
      saving.value = false;
    }
  }

  return {
    locations,
    loading,
    saving,
    filters,
    loadLocations,
    saveLocation,
    removeLocation,
    setLocationFocus
  };
}
