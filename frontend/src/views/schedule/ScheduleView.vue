<script setup lang="ts">
import { inject } from 'vue';
import { useRouter } from 'vue-router';
import ScheduleListPanel from '../../components/schedule/ScheduleListPanel.vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';
import { useScheduleFormDialogStore } from '../../stores/scheduleFormDialogStore';
import { useScheduleStore } from '../../stores/scheduleStore';
import { useHouseDialogStore } from '../../stores/houseDialogStore';

const context = inject<MainLayoutContext>(mainLayoutContextKey);

if (!context) {
  throw new Error('ScheduleView must be used inside MainLayout.');
}

const layoutContext = context;
const router = useRouter();
const scheduleStore = useScheduleStore();
const scheduleFormDialogStore = useScheduleFormDialogStore();
const houseDialogStore = useHouseDialogStore();
</script>

<template>
  <ScheduleListPanel
    :houses="layoutContext.houses.value"
    :schedules="scheduleStore.schedules"
    :loading="layoutContext.loading.value"
    show-calendar-button
    :on-select-house="layoutContext.selectHouse"
    :on-show-route="layoutContext.showRoute"
    :on-edit-house="houseDialogStore.openEdit"
    :on-edit-schedule="scheduleFormDialogStore.open"
    :on-delete-schedule="(scheduleId: string) => layoutContext.deleteSchedule(scheduleId)"
    :on-add-schedule="() => scheduleFormDialogStore.open()"
    :focus-location="layoutContext.focusLocation.value"
    :routes="layoutContext.routes.value"
    :schedule-route-plan="layoutContext.scheduleRoutePlan.value"
    :commute-mode="layoutContext.commuteMode.value"
    :on-show-route-plan="layoutContext.showScheduleRoute"
    @calendar="router.push('/schedule-calendar')"
  />
</template>
