<script setup lang="ts">
import { inject } from 'vue';
import { useRouter } from 'vue-router';
import ScheduleListPanel from '../../components/schedule/ScheduleListPanel.vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';
import { useHouseDialogStore } from '../../stores/houseDialogStore';

const context = inject<MainLayoutContext>(mainLayoutContextKey);

if (!context) {
  throw new Error('ScheduleView must be used inside MainLayout.');
}

const layoutContext = context;
const router = useRouter();
const houseDialogStore = useHouseDialogStore();
</script>

<template>
  <ScheduleListPanel
    :houses="layoutContext.houses.value"
    :loading="layoutContext.loading.value"
    show-calendar-button
    :on-select-house="layoutContext.selectHouse"
    :on-show-route="layoutContext.showRoute"
    :on-edit-house="houseDialogStore.openEdit"
    :focus-location="layoutContext.focusLocation.value"
    :routes="layoutContext.routes.value"
    :schedule-route-plan="layoutContext.scheduleRoutePlan.value"
    :commute-mode="layoutContext.commuteMode.value"
    :on-show-route-plan="layoutContext.showScheduleRoute"
    @calendar="router.push('/schedule-calendar')"
  />
</template>
