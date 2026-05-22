<script setup lang="ts">
import { inject } from 'vue';
import ChatPanel from '../../components/chat/ChatPanel.vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';
import { useHouseCompareStore } from '../../stores/houseCompareStore';
import { useHouseDialogStore } from '../../stores/houseDialogStore';
import { useLocationDialogStore } from '../../stores/locationDialogStore';

const context = inject<MainLayoutContext>(mainLayoutContextKey);
const houseCompareStore = useHouseCompareStore();
const houseDialogStore = useHouseDialogStore();
const locationDialogStore = useLocationDialogStore();

if (!context) {
  throw new Error('ChatView must be used inside MainLayout.');
}
</script>

<template>
  <ChatPanel
    @houses-found="context.onChatHousesFound"
    @select-house="context.onChatSelectHouse"
    @open-house-compare="houseCompareStore.open"
    @confirm-create-house="houseDialogStore.openAgentCreate"
    @confirm-create-location="locationDialogStore.openAgentCreate"
  />
</template>
