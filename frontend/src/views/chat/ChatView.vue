<script setup lang="ts">
import { inject } from 'vue';
import ChatPanel from '../../components/chat/ChatPanel.vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';

const context = inject<MainLayoutContext>(mainLayoutContextKey);

if (!context) {
  throw new Error('ChatView must be used inside MainLayout.');
}
</script>

<template>
  <ChatPanel @houses-found="context.onChatHousesFound" @select-house="context.onChatSelectHouse" />
</template>
