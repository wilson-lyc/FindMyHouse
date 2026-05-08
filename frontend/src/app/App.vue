<template>
  <MapPage />
</template>

<script setup lang="ts">
import MapPage from '../features/maps/pages/MapPage.vue';

if (window.location.pathname !== '/') {
  window.history.replaceState(null, '', '/');
}
</script>
