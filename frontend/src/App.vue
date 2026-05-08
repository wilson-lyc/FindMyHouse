<template>
  <MapView />
</template>

<script setup lang="ts">
import MapView from './views/map/MapView.vue';

if (window.location.pathname !== '/') {
  window.history.replaceState(null, '', '/');
}
</script>
