<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { ChatDotSquare, DataAnalysis, House as HouseIcon, Location as LocationIcon, QuestionFilled, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import HouseFormDialog from '../components/house/HouseFormDialog.vue';
import LocationFormDialog from '../components/location/LocationFormDialog.vue';
import MapPanel from '../components/map/MapPanel.vue';
import type { ConfirmCreateHouseAction, ConfirmCreateHouseResult, ConfirmCreateLocationAction, ConfirmCreateLocationResult } from '../api/chat/chat-api';
import { getDrivingRoute } from '../api/map/map-api';
import { useHouses } from '../composables/house/useHouses';
import { useLocations } from '../composables/location/useLocations';
import { mainLayoutContextKey, type MainLayoutContext } from '../context/main-layout-context';
import { createEmptyHouseForm, normalizeHouseForm } from '../lib/house/house-form';
import { createEmptyLocationForm } from '../lib/location/location-form';
import type { House, HouseForm } from '../model/house/house';
import type { Location, LocationForm } from '../model/location/location';
import type { DrivingRouteResult } from '../model/map/geocode';
import { useMapStore } from '../stores/mapStore';

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

const route = useRoute();
const router = useRouter();
const mapStore = useMapStore();
const {
  currentBounds,
  onlyViewportHouses,
  drivingRoutes,
  activeRouteHouseId,
  selectedHouseId,
  routeData
} = storeToRefs(mapStore);

const dialogVisible = ref(false);
const editingHouse = ref<House | null>(null);
const houseDialogInitialForm = ref<HouseForm | null>(null);
const houseDialogTitle = ref<string>();
const houseDialogCancelText = ref<string>();
const houseDialogSubmitText = ref<string>();
const pendingAgentCreateDone = ref<((result: ConfirmCreateHouseResult) => void) | null>(null);
const locationDialogVisible = ref(false);
const editingLocation = ref<Location | null>(null);
const locationDialogInitialForm = ref<LocationForm | null>(null);
const locationDialogTitle = ref<string>();
const locationDialogCancelText = ref<string>();
const locationDialogSubmitText = ref<string>();
const pendingAgentLocationCreateDone = ref<((result: ConfirmCreateLocationResult) => void) | null>(null);
const mapPanelRef = ref<InstanceType<typeof MapPanel> | null>(null);
const contentPanelWidth = ref(420);
const minContentPanelWidth = 360;
const maxContentPanelWidth = 760;

interface MapCreatePosition {
  longitude: number;
  latitude: number;
}

const activeMenu = computed(() => {
  if (route.name === 'locations' || route.name === 'chat') return String(route.name);
  return 'houses';
});

const focusLocation = computed<Location | null>(() =>
  locations.value.find((loc) => loc.isFocus && loc.latitude !== undefined && loc.longitude !== undefined) ?? null
);

const mappedHouses = computed(() =>
  houses.value.filter((house) => house.latitude !== undefined && house.longitude !== undefined)
);

function openCreateDialog() {
  resetHouseDialogOptions();
  editingHouse.value = null;
  houseDialogInitialForm.value = null;
  dialogVisible.value = true;
}

function openCreateHouseDialogAt(position: MapCreatePosition) {
  resetHouseDialogOptions();
  editingHouse.value = null;
  houseDialogInitialForm.value = {
    ...createEmptyHouseForm(),
    longitude: position.longitude,
    latitude: position.latitude
  };
  dialogVisible.value = true;
}

function openEditDialog(house: House) {
  resetHouseDialogOptions();
  editingHouse.value = house;
  houseDialogInitialForm.value = null;
  dialogVisible.value = true;
}

async function submitHouse(form: HouseForm) {
  try {
    const savedHouse = await saveHouse(normalizeHouseForm(form), editingHouse.value);

    if (pendingAgentCreateDone.value && savedHouse) {
      pendingAgentCreateDone.value({ status: 'created', house: savedHouse });
      pendingAgentCreateDone.value = null;
      onChatHousesFound([savedHouse]);
    }

    closeHouseDialog(false);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  }
}

function resetHouseDialogOptions() {
  if (pendingAgentCreateDone.value) {
    pendingAgentCreateDone.value({ status: 'cancelled' });
    pendingAgentCreateDone.value = null;
  }

  houseDialogTitle.value = undefined;
  houseDialogCancelText.value = undefined;
  houseDialogSubmitText.value = undefined;
}

function closeHouseDialog(cancelPending: boolean) {
  if (cancelPending && pendingAgentCreateDone.value) {
    pendingAgentCreateDone.value({ status: 'cancelled' });
    pendingAgentCreateDone.value = null;
  }

  dialogVisible.value = false;
  editingHouse.value = null;
  houseDialogInitialForm.value = null;
  houseDialogTitle.value = undefined;
  houseDialogCancelText.value = undefined;
  houseDialogSubmitText.value = undefined;
}

function handleHouseDialogVisibleChange(visible: boolean) {
  if (!visible) {
    closeHouseDialog(true);
    return;
  }

  dialogVisible.value = true;
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
    mapStore.removeDrivingRoute(house.id);
    if (activeRouteHouseId.value === house.id) {
      clearRoute();
    }
  } catch {
    // User cancelled the confirmation dialog.
  }
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

function clearRoute() {
  mapPanelRef.value?.clearRoute();
}

async function loadRoutes() {
  const focus = focusLocation.value;
  if (!focus) {
    mapStore.setDrivingRoutes(new Map());
    clearRoute();
    return;
  }

  const targets = houses.value.filter((house) => house.latitude !== undefined && house.longitude !== undefined);

  if (targets.length === 0) {
    mapStore.setDrivingRoutes(new Map());
    clearRoute();
    return;
  }

  const destination = `${focus.longitude},${focus.latitude}`;
  const results = new Map<string, DrivingRouteResult>();

  try {
    await Promise.all(
      targets.map(async (house) => {
        const origin = `${house.longitude},${house.latitude}`;
        const result = await getDrivingRoute(origin, destination);
        if (result) {
          results.set(house.id, result);
        }
      })
    );

    mapStore.setDrivingRoutes(results);
  } catch (error) {
    console.error('Failed to load driving routes:', error);
  }
}

function openCreateLocationDialog() {
  resetLocationDialogOptions();
  editingLocation.value = null;
  locationDialogInitialForm.value = null;
  locationDialogVisible.value = true;
}

function openCreateLocationDialogAt(position: MapCreatePosition) {
  resetLocationDialogOptions();
  editingLocation.value = null;
  locationDialogInitialForm.value = {
    ...createEmptyLocationForm(),
    longitude: position.longitude,
    latitude: position.latitude
  };
  locationDialogVisible.value = true;
}

function openEditLocationDialog(location: Location) {
  editingLocation.value = location;
  locationDialogVisible.value = true;
}

async function submitLocation(form: LocationForm) {
  try {
    const savedLocation = await saveLocation(form, editingLocation.value);

    if (pendingAgentLocationCreateDone.value && savedLocation) {
      pendingAgentLocationCreateDone.value({ status: 'created', location: savedLocation });
      pendingAgentLocationCreateDone.value = null;
    }

    closeLocationDialog(false);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存地点失败');
  }
}

function resetLocationDialogOptions() {
  if (pendingAgentLocationCreateDone.value) {
    pendingAgentLocationCreateDone.value({ status: 'cancelled' });
    pendingAgentLocationCreateDone.value = null;
  }

  locationDialogTitle.value = undefined;
  locationDialogCancelText.value = undefined;
  locationDialogSubmitText.value = undefined;
}

function closeLocationDialog(cancelPending: boolean) {
  if (cancelPending && pendingAgentLocationCreateDone.value) {
    pendingAgentLocationCreateDone.value({ status: 'cancelled' });
    pendingAgentLocationCreateDone.value = null;
  }

  locationDialogVisible.value = false;
  editingLocation.value = null;
  locationDialogInitialForm.value = null;
  locationDialogTitle.value = undefined;
  locationDialogCancelText.value = undefined;
  locationDialogSubmitText.value = undefined;
}

function handleLocationDialogVisibleChange(visible: boolean) {
  if (!visible) {
    closeLocationDialog(true);
    return;
  }

  locationDialogVisible.value = true;
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

function onAgentConfirmCreateHouse(action: ConfirmCreateHouseAction, done: (result: ConfirmCreateHouseResult) => void) {
  resetHouseDialogOptions();
  editingHouse.value = null;
  houseDialogInitialForm.value = action.payload;
  houseDialogTitle.value = action.title;
  houseDialogCancelText.value = '暂不新增';
  houseDialogSubmitText.value = '确认新增';
  pendingAgentCreateDone.value = done;
  dialogVisible.value = true;
}

function onAgentConfirmCreateLocation(action: ConfirmCreateLocationAction, done: (result: ConfirmCreateLocationResult) => void) {
  resetLocationDialogOptions();
  editingLocation.value = null;
  locationDialogInitialForm.value = action.payload;
  locationDialogTitle.value = action.title;
  locationDialogCancelText.value = '暂不新增';
  locationDialogSubmitText.value = '确认新增';
  pendingAgentLocationCreateDone.value = done;
  locationDialogVisible.value = true;
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
  drivingRoutes,
  focusLocation,
  onlyViewportHouses,
  locations,
  locationsLoading,
  locationSaving,
  openCreateDialog,
  openEditDialog,
  submitHouse,
  confirmDeleteHouse,
  applyHouseFilters,
  toggleViewportHouses,
  selectHouse,
  showRoute,
  openCreateLocationDialog,
  openEditLocationDialog,
  submitLocation,
  confirmDeleteLocation,
  setLocationFocus,
  onChatHousesFound,
  onChatSelectHouse,
  onAgentConfirmCreateHouse,
  onAgentConfirmCreateLocation
});

onMounted(async () => {
  await Promise.all([loadHouses(), loadLocations()]);
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
            @edit-house="openEditDialog"
            @create-house="openCreateHouseDialogAt"
            @create-location="openCreateLocationDialogAt"
          />
        </div>
      </el-splitter-panel>
    </el-splitter>

    <HouseFormDialog
      :model-value="dialogVisible"
      :house="editingHouse"
      :initial-form="houseDialogInitialForm"
      :saving="saving"
      :title="houseDialogTitle"
      :cancel-text="houseDialogCancelText"
      :submit-text="houseDialogSubmitText"
      @update:model-value="handleHouseDialogVisibleChange"
      @submit="submitHouse"
    />
    <LocationFormDialog
      :model-value="locationDialogVisible"
      :location="editingLocation"
      :initial-form="locationDialogInitialForm"
      :saving="locationSaving"
      :title="locationDialogTitle"
      :cancel-text="locationDialogCancelText"
      :submit-text="locationDialogSubmitText"
      @update:model-value="handleLocationDialogVisibleChange"
      @submit="submitLocation"
    />
  </main>
</template>
