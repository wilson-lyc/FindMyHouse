import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ConfirmCreateHouseAction, ConfirmCreateHouseResult } from '../api/chat/chat-api';
import { createEmptyHouseForm } from '../lib/house/house-form';
import type { House, HouseForm } from '../model/house/house';

interface MapCreatePosition {
  longitude: number;
  latitude: number;
}

export const useHouseDialogStore = defineStore('houseDialog', () => {
  const visible = ref(false);
  const editingHouse = ref<House | null>(null);
  const initialForm = ref<HouseForm | null>(null);
  const title = ref<string>();
  const cancelText = ref<string>();
  const submitText = ref<string>();
  const initialSection = ref<string>();
  const pendingAgentCreateDone = ref<((result: ConfirmCreateHouseResult) => void) | null>(null);

  function openCreate() {
    resetOptions();
    editingHouse.value = null;
    initialForm.value = null;
    visible.value = true;
  }

  function openCreateAt(position: MapCreatePosition) {
    resetOptions();
    editingHouse.value = null;
    initialForm.value = {
      ...createEmptyHouseForm(),
      longitude: position.longitude,
      latitude: position.latitude
    };
    visible.value = true;
  }

  function openEdit(house: House) {
    resetOptions();
    editingHouse.value = house;
    initialForm.value = null;
    visible.value = true;
  }

  function openAgentCreate(action: ConfirmCreateHouseAction, done: (result: ConfirmCreateHouseResult) => void) {
    resetOptions();
    editingHouse.value = null;
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
    initialSection.value = undefined;
  }

  function cancelPending() {
    if (!pendingAgentCreateDone.value) return;

    pendingAgentCreateDone.value({ status: 'cancelled' });
    pendingAgentCreateDone.value = null;
  }

  function resolveCreated(house: House) {
    if (!pendingAgentCreateDone.value) return;

    pendingAgentCreateDone.value({ status: 'created', house });
    pendingAgentCreateDone.value = null;
  }

  function close(options: { cancelPending?: boolean } = {}) {
    if (options.cancelPending) {
      cancelPending();
    }

    visible.value = false;
    editingHouse.value = null;
    initialForm.value = null;
    title.value = undefined;
    cancelText.value = undefined;
    submitText.value = undefined;
    initialSection.value = undefined;
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
    editingHouse,
    initialForm,
    title,
    cancelText,
    submitText,
    initialSection,
    openCreate,
    openCreateAt,
    openEdit,
    openAgentCreate,
    resolveCreated,
    close,
    setVisible
  };
});
