<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { House as HouseIcon, Location as LocationIcon, ChatDotSquare, Plus, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import HouseFormDialog from '../../components/house/HouseFormDialog.vue';
import HouseListCard from '../../components/house/HouseListCard.vue';
import LocationFormDialog from '../../components/location/LocationFormDialog.vue';
import LocationPanel from '../../components/location/LocationPanel.vue';
import ChatPanel from '../../components/chat/ChatPanel.vue';
import MapPanel from '../../components/map/MapPanel.vue';
import { useHouses } from '../../composables/house/useHouses';
import { useLocations } from '../../composables/location/useLocations';
import { useMapStore } from '../../stores/mapStore';
import { getDrivingRoute } from '../../api/map/map-api';
import { normalizeHouseForm } from '../../lib/house/house-form';
import { houseSourceChannelLabels, houseSourceChannels, houseStatuses, type House, type HouseForm } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import type { Location, LocationForm } from '../../model/location/location';
import type { DrivingRouteResult, MapBoundsFilter } from '../../model/map/geocode';

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

const mapStore = useMapStore();

const dialogVisible = ref(false);
const editingHouse = ref<House | null>(null);
const locationDialogVisible = ref(false);
const editingLocation = ref<Location | null>(null);
const selectedHouse = ref<House | null>(null);
const selectedHouseFocusKey = ref(0);
const activePanel = ref<'houses' | 'locations' | 'chat'>('houses');
const onlyViewportHouses = ref(false);
const currentMapBounds = ref<MapBoundsFilter | null>(null);
const leftPanelWidth = ref(420);
const minLeftPanelWidth = 360;
const maxLeftPanelWidth = 760;
const drivingRoutes = ref<Map<string, DrivingRouteResult>>(new Map());
const routeData = ref<DrivingRouteResult | null>(null);
const activeRouteHouseId = ref<string | null>(null);
const highlightedHouseIds = ref<string[]>([]);

const focusLocation = computed<Location | null>(() =>
  locations.value.find(
    (loc) => loc.isFocus && loc.latitude !== undefined && loc.longitude !== undefined
  ) ?? null
);

const mappedHouses = computed(() =>
  houses.value.filter((house) => house.latitude !== undefined && house.longitude !== undefined)
);

function openCreateDialog() {
  editingHouse.value = null;
  dialogVisible.value = true;
}

function openEditDialog(house: House) {
  editingHouse.value = house;
  dialogVisible.value = true;
}

async function submitHouse(form: HouseForm) {
  try {
    await saveHouse(normalizeHouseForm(form), editingHouse.value);
    dialogVisible.value = false;
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
    if (selectedHouse.value?.id === house.id) {
      selectedHouse.value = null;
    }
    const nextRoutes = new Map(drivingRoutes.value);
    nextRoutes.delete(house.id);
    drivingRoutes.value = nextRoutes;
    if (activeRouteHouseId.value === house.id) {
      clearRoute();
    }
  } catch {
    // User cancelled the confirmation dialog.
  }
}

async function applyMapBounds(bounds: MapBoundsFilter) {
  currentMapBounds.value = bounds;
  if (!onlyViewportHouses.value) return;

  await applyHouseFilters();
}

async function applyHouseFilters() {
  if (onlyViewportHouses.value && currentMapBounds.value) {
    Object.assign(filters, currentMapBounds.value);
  } else {
    filters.minLatitude = undefined;
    filters.maxLatitude = undefined;
    filters.minLongitude = undefined;
    filters.maxLongitude = undefined;
  }

  await loadHouses();
}

async function toggleViewportHouses() {
  await applyHouseFilters();
}

function selectHouse(house: House) {
  selectedHouse.value = house;
  selectedHouseFocusKey.value += 1;
  mapStore.selectHouse(house.id);
}

function showRoute(house: House) {
  const route = drivingRoutes.value.get(house.id);
  if (!route) {
    ElMessage.info('路线数据正在加载，请稍后再试');
    return;
  }

  routeData.value = route;
  mapStore.setRouteData(route);
  activeRouteHouseId.value = house.id;
}

function clearRoute() {
  routeData.value = null;
  mapStore.setRouteData(null);
  activeRouteHouseId.value = null;
}

async function loadRoutes() {
  const focus = focusLocation.value;
  if (!focus) {
    drivingRoutes.value = new Map();
    clearRoute();
    return;
  }

  const targets = houses.value.filter(
    (house) => house.latitude !== undefined && house.longitude !== undefined
  );

  if (targets.length === 0) {
    drivingRoutes.value = new Map();
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

    drivingRoutes.value = results;
    if (activeRouteHouseId.value) {
      routeData.value = results.get(activeRouteHouseId.value) ?? null;
      mapStore.setRouteData(routeData.value);
      if (!routeData.value) {
        activeRouteHouseId.value = null;
      }
    }
  } catch (error) {
    console.error('Failed to load driving routes:', error);
  }
}

watch(focusLocation, () => {
  clearRoute();
  void loadRoutes();
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

function showPanel(panel: string) {
  if (panel === 'locations') {
    activePanel.value = 'locations';
  } else if (panel === 'chat') {
    activePanel.value = 'chat';
  } else {
    activePanel.value = 'houses';
  }
}

function onChatHousesFound(houses: House[]) {
  const ids = houses.map((h) => h.id);
  highlightedHouseIds.value = ids;
  mapStore.setHighlightedHouseIds(ids);
}

function onChatSelectHouse(house: House) {
  const ids = [house.id];
  highlightedHouseIds.value = ids;
  mapStore.setHighlightedHouseIds(ids);
  selectHouse(house);
  activePanel.value = 'chat';
}

function notifyMapResize() {
  window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

function openCreateLocationDialog() {
  editingLocation.value = null;
  locationDialogVisible.value = true;
}

function openEditLocationDialog(location: Location) {
  editingLocation.value = location;
  locationDialogVisible.value = true;
}

async function submitLocation(form: LocationForm) {
  try {
    await saveLocation(form, editingLocation.value);
    locationDialogVisible.value = false;
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

onMounted(async () => {
  await Promise.all([loadHouses(), loadLocations()]);
  await loadRoutes();
});
</script>

<template>
  <main class="map-page">
    <el-splitter @resize-end="notifyMapResize">
      <el-splitter-panel v-model:size="leftPanelWidth" :min="minLeftPanelWidth" :max="maxLeftPanelWidth">
        <aside class="map-data-panel">
        <nav class="map-directory-rail" aria-label="地图数据目录">
          <el-menu class="map-directory-menu" :default-active="activePanel" @select="showPanel">
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
            <el-tooltip content="设置" placement="right">
              <router-link class="map-directory-icon-button" to="/settings" aria-label="设置">
                <el-icon><Setting /></el-icon>
              </router-link>
            </el-tooltip>
          </div>
        </nav>

        <section class="map-data-content">
          <div v-if="activePanel === 'houses'" class="map-houses-pane">
            <div class="map-house-controls">
              <div class="map-house-control-row">
                <el-button type="primary" :icon="Plus" @click="openCreateDialog">添加房源</el-button>
                <el-checkbox v-model="onlyViewportHouses" @change="toggleViewportHouses">仅视野</el-checkbox>
              </div>
              <div class="map-house-control-row map-house-filter-row">
                <el-select v-model="filters.status" clearable placeholder="状态" @change="applyHouseFilters">
                  <el-option
                    v-for="status in houseStatuses"
                    :key="status"
                    :label="statusLabels[status]"
                    :value="status"
                  />
                </el-select>
                <el-select v-model="filters.sourceChannel" clearable placeholder="渠道" @change="applyHouseFilters">
                  <el-option
                    v-for="channel in houseSourceChannels"
                    :key="channel"
                    :label="houseSourceChannelLabels[channel]"
                    :value="channel"
                  />
                </el-select>
              </div>
            </div>

            <div v-loading="loading" class="house-card-list map-data-list">
              <el-empty v-if="!loading && !houses.length" description="暂无房源数据" />
              <template v-else>
                <HouseListCard
                  v-for="house in houses"
                  :key="house.id"
                  :house="house"
                  :driving-distance="drivingRoutes.get(house.id)"
                  :focus-location-name="focusLocation?.name"
                  @select="selectHouse"
                  @edit="openEditDialog"
                  @delete="confirmDeleteHouse"
                  @route="showRoute"
                />
              </template>
            </div>
          </div>
          <LocationPanel
            v-else-if="activePanel === 'locations'"
            :locations="locations"
            :loading="locationsLoading"
            @create="openCreateLocationDialog"
            @edit="openEditLocationDialog"
            @delete="confirmDeleteLocation"
            @set-focus="setLocationFocus"
          />
          <ChatPanel
            v-else-if="activePanel === 'chat'"
            @houses-found="onChatHousesFound"
            @select-house="onChatSelectHouse"
          />
        </section>
        </aside>
      </el-splitter-panel>
      <el-splitter-panel>
        <div class="map-canvas-panel">
        <MapPanel
          @bounds-change="applyMapBounds"
          @edit-house="openEditDialog"
          @select-house="selectHouse"
          @clear-route="clearRoute"
        />
        </div>
      </el-splitter-panel>
    </el-splitter>
    <HouseFormDialog v-model="dialogVisible" :house="editingHouse" :saving="saving" @submit="submitHouse" />
    <LocationFormDialog
      v-model="locationDialogVisible"
      :location="editingLocation"
      :saving="locationSaving"
      @submit="submitLocation"
    />
  </main>
</template>
