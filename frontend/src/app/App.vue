<script setup lang="ts">
import { computed } from 'vue';
import ListingsPage from '../features/listings/pages/ListingsPage.vue';
import MapPage from '../features/maps/pages/MapPage.vue';

const path = computed(() => window.location.pathname.replace(/\/$/, '') || '/');
</script>

<template>
  <ListingsPage v-if="path === '/admin/listings' || path === '/listings'" />
  <MapPage v-else />
</template>
