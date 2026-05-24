<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import {
  ChatDotSquare,
  DataAnalysis,
  Download,
  House as HouseIcon,
  Location as LocationIcon,
  QuestionFilled,
  Calendar,
  Setting,
  Upload
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import HouseCompareDialog from '../components/house/HouseCompareDialog.vue';
import HouseFormDialog from '../components/house/HouseFormDialog.vue';
import LocationFormDialog from '../components/location/LocationFormDialog.vue';
import MapPanel from '../components/map/MapPanel.vue';
import ScheduleFormDialog from '../components/schedule/ScheduleFormDialog.vue';
import { getCommuteRoute } from '../api/map/map-api';
import { useHouses } from '../composables/house/useHouses';
import { useLocations } from '../composables/location/useLocations';
import { mainLayoutContextKey, type MainLayoutContext } from '../context/main-layout-context';
import { normalizeHouseForm } from '../lib/house/house-form';
import type { House, HouseForm } from '../model/house/house';
import type { ScheduleForm } from '../model/schedule/schedule';
import type { Location, LocationForm } from '../model/location/location';
import type { CommuteRouteResult, CommuteMode } from '../model/map/geocode';
import type { ScheduleRoutePlan } from '../lib/schedule/route-planner';
import { useHouseCompareStore } from '../stores/houseCompareStore';
import { useHouseDialogStore } from '../stores/houseDialogStore';
import { useLocationDialogStore } from '../stores/locationDialogStore';
import { useMapStore } from '../stores/mapStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useScheduleFormDialogStore } from '../stores/scheduleFormDialogStore';

const {
  houses,
  loading,
  saving,
  filters,
  loadHouses,
  saveHouse,
  removeHouse
} = useHouses();
const { locations, loading: locationsLoading, saving: locationSaving, loadLocations, saveLocation, removeLocation, setLocationFocus } =
  useLocations();
const scheduleStore = useScheduleStore();

const route = useRoute();
const router = useRouter();
const mapStore = useMapStore();
const {
  currentBounds,
  onlyViewportHouses,
  routes,
  scheduleRoutePlan,
  commuteMode,
  activeRouteHouseId,
  selectedHouseId
} = storeToRefs(mapStore);
const houseCompareStore = useHouseCompareStore();
const { visible: houseCompareDialogVisible, houses: houseCompareDialogHouses } = storeToRefs(houseCompareStore);
const houseDialogStore = useHouseDialogStore();
const {
  visible: houseDialogVisible,
  editingHouse,
  initialForm: houseDialogInitialForm,
  title: houseDialogTitle,
  cancelText: houseDialogCancelText,
  submitText: houseDialogSubmitText,
  initialSection: houseDialogInitialSection
} = storeToRefs(houseDialogStore);
const scheduleFormDialogStore = useScheduleFormDialogStore();
const {
  visible: scheduleFormDialogVisible,
  editingSchedule: scheduleFormEditingSchedule,
  prefillHouseId: scheduleFormPrefillHouseId
} = storeToRefs(scheduleFormDialogStore);
const locationDialogStore = useLocationDialogStore();
const {
  visible: locationDialogVisible,
  editingLocation,
  initialForm: locationDialogInitialForm,
  title: locationDialogTitle,
  cancelText: locationDialogCancelText,
  submitText: locationDialogSubmitText
} = storeToRefs(locationDialogStore);

const scheduleSaving = ref(false);

const mapPanelRef = ref<InstanceType<typeof MapPanel> | null>(null);
const contentPanelWidth = ref(420);
const minContentPanelWidth = 360;
const maxContentPanelWidth = 760;

const activeMenu = computed(() => {
  if (route.name === 'locations' || route.name === 'chat' || route.name === 'schedule') return String(route.name);
  return 'houses';
});

const focusLocation = computed<Location | null>(() =>
  locations.value.find((loc) => loc.isFocus && loc.latitude !== undefined && loc.longitude !== undefined) ?? null
);

const mappedHouses = computed(() =>
  houses.value.filter((house) => house.latitude !== undefined && house.longitude !== undefined)
);

async function submitHouse(form: HouseForm) {
  try {
    const savedHouse = await saveHouse(normalizeHouseForm(form), editingHouse.value);

    if (savedHouse) {
      houseDialogStore.resolveCreated(savedHouse);
      onChatHousesFound([savedHouse]);
    }

    houseDialogStore.close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  }
}

async function confirmDeleteHouse(house: House) {
  try {
    await ElMessageBox.confirm(`确认删除「${house.name}」吗？`, '删除房源', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await removeHouse(house);
    if (selectedHouseId.value === house.id) {
      mapStore.selectHouse(undefined);
    }
    mapStore.removeRoute(house.id);
    if (activeRouteHouseId.value === house.id) {
      clearRoute();
    }
  } catch {
    // User cancelled the confirmation dialog.
  }
}

async function deleteSchedule(scheduleId: string) {
  try {
    await scheduleStore.removeSchedule(scheduleId);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除日程失败');
  }
}

async function submitScheduleForm(form: ScheduleForm) {
  const editing = scheduleFormEditingSchedule.value;
  scheduleSaving.value = true;

  try {
    if (editing) {
      await scheduleStore.editSchedule(editing.id, {
        viewingAt: form.viewingAt,
        note: form.note
      });
    } else {
      await scheduleStore.addSchedule(form);
    }

    scheduleFormDialogStore.close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存日程失败');
  } finally {
    scheduleSaving.value = false;
  }
}

function editSchedule(schedule: import('../model/schedule/schedule').Schedule) {
  scheduleFormDialogStore.open(schedule);
}

async function applyHouseFilters() {
  if (onlyViewportHouses.value && currentBounds.value) {
    Object.assign(filters, currentBounds.value);
  } else {
    filters.minLatitude = undefined;
    filters.maxLatitude = undefined;
    filters.minLongitude = undefined;
    filters.maxLongitude = undefined;
  }

  await loadHouses();
}

async function toggleViewportHouses(enabled: boolean) {
  mapStore.setOnlyViewportHouses(enabled);
  await applyHouseFilters();
}

function selectHouse(house: House) {
  mapPanelRef.value?.selectHouseById(house.id);
}

function showRoute(house: House) {
  if (!mapPanelRef.value?.showRouteByHouseId(house.id)) {
    ElMessage.info('路线数据正在加载，请稍后再试');
  }
}

function showScheduleRoute(plan: ScheduleRoutePlan) {
  mapStore.showScheduleRoute(plan);
}

function clearRoute() {
  mapPanelRef.value?.clearRoute();
}

async function loadRoutes(mode?: CommuteMode) {
  const currentMode = mode ?? commuteMode.value;
  const focus = focusLocation.value;
  if (!focus) {
    mapStore.setRoutes(new Map());
    clearRoute();
    return;
  }

  const targets = houses.value.filter((house) => house.latitude !== undefined && house.longitude !== undefined);

  if (targets.length === 0) {
    mapStore.setRoutes(new Map());
    clearRoute();
    return;
  }

  const destination = `${focus.longitude},${focus.latitude}`;
  const results = new Map<string, CommuteRouteResult>();

  try {
    await Promise.all(
      targets.map(async (house) => {
        const origin = `${house.longitude},${house.latitude}`;
        const result = await getCommuteRoute(origin, destination, currentMode);
        if (result) {
          results.set(house.id, result);
        }
      })
    );

    mapStore.setRoutes(results);
  } catch (error) {
    console.error(`Failed to load ${currentMode} routes:`, error);
  }
}

async function submitLocation(form: LocationForm) {
  try {
    const savedLocation = await saveLocation(form, editingLocation.value);

    if (savedLocation) {
      locationDialogStore.resolveCreated(savedLocation);
    }

    locationDialogStore.close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存地点失败');
  }
}

async function confirmDeleteLocation(location: Location) {
  try {
    await ElMessageBox.confirm(`确认删除「${location.name}」吗？`, '删除地点', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await removeLocation(location);
  } catch {
    // User cancelled the confirmation dialog.
  }
}

function onChatHousesFound(foundHouses: House[]) {
  const ids = foundHouses.map((h) => h.id);
  mapPanelRef.value?.setHighlightedHouseIds(ids);
}

function onChatSelectHouse(house: House) {
  selectHouse(house);
}

function notifyMapResize() {
  window.requestAnimationFrame(() => {
    mapPanelRef.value?.resize();
    mapPanelRef.value?.refreshBounds();
  });
}

async function navigateTo(name: string) {
  await router.push({ name });
}

watch(commuteMode, () => {
  clearRoute();
  void loadRoutes();
});

watch(focusLocation, () => {
  clearRoute();
  void loadRoutes();
});

watch(currentBounds, () => {
  if (onlyViewportHouses.value) {
    void applyHouseFilters();
  }
});

watch(
  () => houses.value.map((house) => `${house.id}:${house.latitude},${house.longitude}`).join('|'),
  () => {
    void loadRoutes();
  }
);

watch(
  mappedHouses,
  (val) => {
    mapStore.setHouses(val);
  },
  { deep: true }
);

watch(
  locations,
  (val) => {
    mapStore.setLocations(val);
  },
  { deep: true }
);

provide<MainLayoutContext>(mainLayoutContextKey, {
  houses,
  loading,
  saving,
  filters,
  routes,
  scheduleRoutePlan,
  commuteMode,
  focusLocation,
  onlyViewportHouses,
  locations,
  locationsLoading,
  locationSaving,
  submitHouse,
  deleteSchedule,
  confirmDeleteHouse,
  applyHouseFilters,
  toggleViewportHouses,
  selectHouse,
  showRoute,
  showScheduleRoute,
  submitLocation,
  confirmDeleteLocation,
  setLocationFocus,
  onChatHousesFound,
  onChatSelectHouse
});

onMounted(async () => {
  await Promise.all([loadHouses(), loadLocations(), scheduleStore.loadSchedules()]);
  await loadRoutes();
});
</script>

<template>
  <main class="main-layout">
    <aside class="main-layout-nav" aria-label="主导航">
      <el-menu class="map-directory-menu" :default-active="activeMenu" @select="navigateTo">
        <el-menu-item index="houses">
          <el-icon><HouseIcon /></el-icon>
          <span>房源</span>
        </el-menu-item>
        <el-menu-item index="locations">
          <el-icon><LocationIcon /></el-icon>
          <span>地点</span>
        </el-menu-item>
        <el-menu-item index="schedule">
          <el-icon><Calendar /></el-icon>
          <span>日程</span>
        </el-menu-item>
        <el-menu-item index="chat">
          <el-icon><ChatDotSquare /></el-icon>
          <span>对话</span>
        </el-menu-item>
      </el-menu>
      <div class="map-directory-bottom">
        <el-tooltip content="统计" placement="right">
          <router-link class="map-directory-icon-button" to="/stats" aria-label="统计">
            <el-icon><DataAnalysis /></el-icon>
          </router-link>
        </el-tooltip>
        <el-tooltip content="导出" placement="right">
          <router-link class="map-directory-icon-button" to="/export" aria-label="导出">
            <el-icon><Download /></el-icon>
          </router-link>
        </el-tooltip>
        <el-tooltip content="导入" placement="right">
          <router-link class="map-directory-icon-button" to="/import" aria-label="导入">
            <el-icon><Upload /></el-icon>
          </router-link>
        </el-tooltip>
        <el-tooltip content="帮助" placement="right">
          <router-link class="map-directory-icon-button" to="/help" aria-label="帮助">
            <el-icon><QuestionFilled /></el-icon>
          </router-link>
        </el-tooltip>
        <el-tooltip content="设置" placement="right">
          <router-link class="map-directory-icon-button" to="/settings" aria-label="设置">
            <el-icon><Setting /></el-icon>
          </router-link>
        </el-tooltip>
      </div>
    </aside>

    <el-splitter class="main-layout-splitter" @resize-end="notifyMapResize">
      <el-splitter-panel v-model:size="contentPanelWidth" :min="minContentPanelWidth" :max="maxContentPanelWidth">
        <section class="map-data-content">
          <router-view />
        </section>
      </el-splitter-panel>
      <el-splitter-panel>
        <div class="map-canvas-panel">
          <MapPanel
            ref="mapPanelRef"
            @edit-house="houseDialogStore.openEdit"
            @create-house="houseDialogStore.openCreateAt"
            @create-location="locationDialogStore.openCreateAt"
          />
        </div>
      </el-splitter-panel>
    </el-splitter>

    <HouseFormDialog
      :model-value="houseDialogVisible"
      :house="editingHouse"
      :initial-form="houseDialogInitialForm"
      :saving="saving"
      :title="houseDialogTitle"
      :cancel-text="houseDialogCancelText"
      :submit-text="houseDialogSubmitText"
      :initial-section="houseDialogInitialSection"
      @update:model-value="houseDialogStore.setVisible"
      @submit="submitHouse"
    />
    <ScheduleFormDialog
      :model-value="scheduleFormDialogVisible"
      :editing-schedule="scheduleFormEditingSchedule"
      :prefill-house-id="scheduleFormPrefillHouseId"
      :houses="houses"
      :saving="scheduleSaving"
      @update:model-value="scheduleFormDialogStore.setVisible"
      @submit="submitScheduleForm"
    />
    <LocationFormDialog
      :model-value="locationDialogVisible"
      :location="editingLocation"
      :initial-form="locationDialogInitialForm"
      :saving="locationSaving"
      :title="locationDialogTitle"
      :cancel-text="locationDialogCancelText"
      :submit-text="locationDialogSubmitText"
      @update:model-value="locationDialogStore.setVisible"
      @submit="submitLocation"
    />
    <HouseCompareDialog
      v-model="houseCompareDialogVisible"
      :houses="houseCompareDialogHouses"
      :routes="routes"
      :loading="loading"
    />
  </main>
</template>
