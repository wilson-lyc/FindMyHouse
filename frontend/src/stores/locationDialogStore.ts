import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ConfirmCreateLocationAction, ConfirmCreateLocationResult } from '../api/chat/chat-api';
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
  const pendingAgentCreateDone = ref<((result: ConfirmCreateLocationResult) => void) | null>(null);

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

  function openAgentCreate(action: ConfirmCreateLocationAction, done: (result: ConfirmCreateLocationResult) => void) {
    resetOptions();
    editingLocation.value = null;
    initialForm.value = action.payload;
    title.value = action.title;
    cancelText.value = '暂不新增';
    submitText.value = '确认新增';
    pendingAgentCreateDone.value = done;
    visible.value = true;
  }

  function resetOptions() {
    cancelPending();
    title.value = undefined;
    cancelText.value = undefined;
    submitText.value = undefined;
  }

  function cancelPending() {
    if (!pendingAgentCreateDone.value) return;

    pendingAgentCreateDone.value({ status: 'cancelled' });
    pendingAgentCreateDone.value = null;
  }

  function resolveCreated(location: Location) {
    if (!pendingAgentCreateDone.value) return;

    pendingAgentCreateDone.value({ status: 'created', location });
    pendingAgentCreateDone.value = null;
  }

  function close(options: { cancelPending?: boolean } = {}) {
    if (options.cancelPending) {
      cancelPending();
    }

    visible.value = false;
    editingLocation.value = null;
    initialForm.value = null;
    title.value = undefined;
    cancelText.value = undefined;
    submitText.value = undefined;
  }

  function setVisible(nextVisible: boolean) {
    if (!nextVisible) {
      close({ cancelPending: true });
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
    openAgentCreate,
    resolveCreated,
    close,
    setVisible
  };
});
