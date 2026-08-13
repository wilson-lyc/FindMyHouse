import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createEmptyLocationForm } from '../lib/location/location-form';
import type { Location, LocationForm } from '../model/location/location';

interface MapCreatePosition {
  longitude: number;
  latitude: number;
}

export const useLocationDialogStore = defineStore('locationDialog', () => {
  const visible = ref(false);
  const editingLocation = ref<Location | null>(null);
  const initialForm = ref<LocationForm | null>(null);
  const title = ref<string>();
  const cancelText = ref<string>();
  const submitText = ref<string>();

  function openCreate() {
    resetOptions();
    editingLocation.value = null;
    initialForm.value = null;
    visible.value = true;
  }

  function openCreateAt(position: MapCreatePosition) {
    resetOptions();
    editingLocation.value = null;
    initialForm.value = {
      ...createEmptyLocationForm(),
      longitude: position.longitude,
      latitude: position.latitude
    };
    visible.value = true;
  }

  function openEdit(location: Location) {
    resetOptions();
    editingLocation.value = location;
    initialForm.value = null;
    visible.value = true;
  }

  function resetOptions() {
    title.value = undefined;
    cancelText.value = undefined;
    submitText.value = undefined;
  }

  function resolveCreated() {
    close();
  }

  function close() {
    visible.value = false;
    editingLocation.value = null;
    initialForm.value = null;
    title.value = undefined;
    cancelText.value = undefined;
    submitText.value = undefined;
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
    editingLocation,
    initialForm,
    title,
    cancelText,
    submitText,
    openCreate,
    openCreateAt,
    openEdit,
    resolveCreated,
    close,
    setVisible
  };
});
