<script setup lang="ts">
import { inject } from 'vue';
import LocationPanel from '../../components/location/LocationPanel.vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';
import { useLocationDialogStore } from '../../stores/locationDialogStore';

const context = inject<MainLayoutContext>(mainLayoutContextKey);
const locationDialogStore = useLocationDialogStore();

if (!context) {
  throw new Error('LocationsView must be used inside MainLayout.');
}
</script>

<template>
  <LocationPanel
    :locations="context.locations.value"
    :loading="context.locationsLoading.value"
    @create="locationDialogStore.openCreate"
    @edit="locationDialogStore.openEdit"
    @delete="context.confirmDeleteLocation"
    @set-focus="context.setLocationFocus"
  />
</template>
