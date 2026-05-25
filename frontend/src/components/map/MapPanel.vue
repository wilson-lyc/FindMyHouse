<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import {
  Aim,
  Close,
  House as HouseIcon,
  Location as LocationIcon,
  OfficeBuilding
} from '@element-plus/icons-vue';
import { formatCurrency } from '../../lib/format';
import { defaultMapZoom, focusedHouseMapZoom, focusedPlaceMapZoom } from '../../lib/map/map-zoom';
import { formatDistanceShort } from '../../lib/map/route-format';
import { useMapStore } from '../../stores/mapStore';
import {
  loadAmap,
  type AMapInfoWindow,
  type AMapLngLat,
  type AMapMap,
  type AMapMarker,
  type AMapNamespace,
  type AMapRoutePlanner,
  type AMapRouteSearchResult,
  type AMapRouteStatus
} from '../../lib/map/amap-loader';
import type { House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import type { Location as KeyLocation } from '../../model/location/location';
import { locationCategoryLabels } from '../../model/location/location';
import type { CommuteMode } from '../../model/map/geocode';
import MapPointRoutePanel from './MapPointRoutePanel.vue';

const emit = defineEmits<{
  editHouse: [house: House];
  createHouse: [position: MapContextMenuPosition];
  createLocation: [position: MapContextMenuPosition];
}>();

interface MapContextMenuPosition {
  longitude: number;
  latitude: number;
}

const mapStore = useMapStore();
const {
  houses,
  locations,
  mode,
  selectedHouseId,
  selectedHouseFocusKey,
  pointRouteOrigin,
  pointRouteDestination,
  pointRouteRequestKey,
  scheduleRoutePlan,
  searchResultHouses,
  commuteMode
} = storeToRefs(mapStore);

// ==================== 地图实例 ====================

const mapContainer = ref<HTMLDivElement>();
const pointRouteResultPanel = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');
const nativeRouteCollapse = ref<string[]>([]);
const isSearchResultMode = computed(() => mode.value === 'house-search-results');
const visibleHouses = computed(() => (isSearchResultMode.value ? searchResultHouses.value : houses.value));
const hasFocusLocation = computed(() => locations.value.some((loc) => loc.isFocus));

const houseFocusZoom = focusedHouseMapZoom;
const locationFocusZoom = focusedPlaceMapZoom;

let hasAppliedInitialFocus = false;
let resizeObserver: ResizeObserver | undefined;

// ==================== 右键菜单 ====================

const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  longitude: number;
  latitude: number;
}>({
  visible: false,
  x: 0,
  y: 0,
  longitude: 0,
  latitude: 0
});

function closeContextMenu() {
  contextMenu.value.visible = false;
}

function getEventLngLat(event?: { lnglat?: { lng?: number; lat?: number; getLng?: () => number; getLat?: () => number } }) {
  const longitude = event?.lnglat?.getLng?.() ?? event?.lnglat?.lng;
  const latitude = event?.lnglat?.getLat?.() ?? event?.lnglat?.lat;
  if (longitude === undefined || latitude === undefined) return undefined;

  return { longitude, latitude };
}

function getEventPixel(event?: { pixel?: { x?: number; y?: number; getX?: () => number; getY?: () => number } }) {
  const x = event?.pixel?.getX?.() ?? event?.pixel?.x;
  const y = event?.pixel?.getY?.() ?? event?.pixel?.y;
  if (x === undefined || y === undefined) return undefined;

  return { x, y };
}

function openContextMenu(event?: Parameters<AMapMap['on']>[1] extends (mapEvent?: infer E) => void ? E : never) {
  const position = getEventLngLat(event);
  const pixel = getEventPixel(event);
  if (!position || !pixel) return;

  contextMenu.value = {
    visible: true,
    x: pixel.x,
    y: pixel.y,
    ...position
  };
}

function createHouseFromContextMenu() {
  emit('createHouse', {
    longitude: contextMenu.value.longitude,
    latitude: contextMenu.value.latitude
  });
  closeContextMenu();
}

function createLocationFromContextMenu() {
  emit('createLocation', {
    longitude: contextMenu.value.longitude,
    latitude: contextMenu.value.latitude
  });
  closeContextMenu();
}

function setupNativeControls() {
  if (!map.value || !amap.value) return;

  amap.value.plugin(['AMap.Scale'], () => {
    if (!map.value || !amap.value) return;

    if (amap.value.Scale) {
      map.value.addControl(new amap.value.Scale({ position: 'LB' }));
    }
  });
}

// ==================== 信息窗口 ====================

let infoWindow: AMapInfoWindow | undefined;

function createInfoWindow(content: string, position: [number, number]) {
  if (!amap.value || !map.value) return;
  infoWindow?.close();
  infoWindow = new amap.value.InfoWindow({
    content,
    offset: new amap.value.Pixel(0, -32)
  });
  infoWindow.open(map.value, position);
}

function houseInfoContent(house: House) {
  return `<div class="map-info map-house-info"><button class="map-info-close-button" type="button" aria-label="关闭">×</button><strong>${house.name}</strong><span>${house.address}</span><span>${formatCurrency(house.rentPrice)} · ${statusLabels[house.status]}</span><div class="map-info-actions"><button class="el-button el-button--small map-info-route-button" data-house-id="${house.id}" type="button"><span>路线</span></button><button class="el-button el-button--small map-info-detail-button" data-house-id="${house.id}" type="button"><span>详情</span></button></div></div>`;
}

function bindInfoCloseAction() {
  window.setTimeout(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.map-info-close-button');
    for (const button of buttons) {
      button.onclick = () => infoWindow?.close();
    }
  }, 0);
}

function bindHouseInfoAction(house: House) {
  window.setTimeout(() => {
    const detailButtons = document.querySelectorAll<HTMLButtonElement>('.map-info-detail-button');
    for (const button of detailButtons) {
      if (button.dataset.houseId === house.id) {
        button.onclick = () => emit('editHouse', house);
      }
    }
    const routeButtons = document.querySelectorAll<HTMLButtonElement>('.map-info-route-button');
    for (const button of routeButtons) {
      if (button.dataset.houseId === house.id) {
        button.onclick = () => showRouteByHouseId(house.id);
      }
    }
  }, 0);
}

function openHouseInfoWindow(house: House, position: [number, number]) {
  createInfoWindow(houseInfoContent(house), position);
  bindInfoCloseAction();
  bindHouseInfoAction(house);
}

function locationInfoContent(location: KeyLocation) {
  return `<div class="map-info"><button class="map-info-close-button" type="button" aria-label="关闭">×</button><strong>${location.name}</strong><span>${locationCategoryLabels[location.category]} · ${location.address}</span></div>`;
}

// ==================== 视野与边界 ====================

let boundsTimer: number | undefined;

function emitBounds() {
  if (!map.value) return;
  const bounds = map.value.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  mapStore.setCurrentBounds({
    minLatitude: southWest.lat,
    maxLatitude: northEast.lat,
    minLongitude: southWest.lng,
    maxLongitude: northEast.lng
  });
}

function scheduleBoundsChange() {
  window.clearTimeout(boundsTimer);
  boundsTimer = window.setTimeout(emitBounds, 300);
}

// ==================== 示例大头针 ====================

function housePosition(house: House): [number, number] | undefined {
  if (house.longitude === undefined || house.latitude === undefined) {
    return undefined;
  }

  return [house.longitude, house.latitude];
}

function locationPosition(location: KeyLocation): [number, number] | undefined {
  if (location.longitude === undefined || location.latitude === undefined) {
    return undefined;
  }

  return [location.longitude, location.latitude];
}

/** 聚焦到指定房源，放大地图并弹出信息窗口 */
function focusHouse(house: House, position: [number, number]) {
  if (!map.value) return;

  map.value.setZoomAndCenter(houseFocusZoom, position, true, 0);
  openHouseInfoWindow(house, position);
}

function focusHouseById(houseId: string) {
  const house = visibleHouses.value.find((item) => item.id === houseId) ?? houses.value.find((item) => item.id === houseId);
  const position = house ? housePosition(house) : undefined;
  if (!house || !position || !map.value) return false;

  focusHouse(house, position);
  return true;
}

function selectHouseById(houseId: string) {
  mapStore.selectHouse(houseId);
  return focusHouseById(houseId);
}

function focusLocation(location: KeyLocation, position: [number, number]) {
  if (!map.value) return;

  map.value.setZoomAndCenter(locationFocusZoom, position, true, 0);
  createInfoWindow(locationInfoContent(location), position);
  bindInfoCloseAction();
}

function focusLocationById(locationId: string) {
  const location = locations.value.find((item) => item.id === locationId);
  const position = location ? locationPosition(location) : undefined;
  if (!location || !position || !map.value) return false;

  focusLocation(location, position);
  return true;
}

function focusFocusLocation() {
  const focusLocation = locations.value.find((location) => location.isFocus);
  const position = focusLocation ? locationPosition(focusLocation) : undefined;
  if (!focusLocation || !position || !map.value) return false;

  map.value.setZoomAndCenter(locationFocusZoom, position, true, 0);
  return true;
}

/** 首次加载时跳转到焦点地点 */
function applyInitialFocusLocation() {
  if (!map.value || hasAppliedInitialFocus) return false;

  const focusLocation = locations.value.find((location) => location.isFocus);
  const position = focusLocation ? locationPosition(focusLocation) : undefined;
  if (!focusLocation || !position) return false;

  map.value.setZoomAndCenter(locationFocusZoom, position, true, 0);

  hasAppliedInitialFocus = true;
  return true;
}

/** 渲染房源和地点的大头针；搜索结果模式下房源收敛到搜索结果，地点保持全量展示。 */
let houseMarkersById = new Map<string, AMapMarker>();
let mapPointMarkers: AMapMarker[] = [];

function clearMapPointMarkers() {
  if (!map.value || mapPointMarkers.length === 0) return;

  map.value.remove(mapPointMarkers);
  mapPointMarkers = [];
  houseMarkersById = new Map();
}

function renderMarkers() {
  if (!map.value || !amap.value) return;

  clearMapPointMarkers();
  const markers = [];

  for (const house of visibleHouses.value) {
    const position = housePosition(house);
    if (!position) continue;

    const marker = new amap.value.Marker({
      position,
      title: house.name,
      label: {
        content: `<div class="map-marker-label house">¥${house.rentPrice}</div>`,
        direction: 'top'
      }
    });

    marker.on('click', () => {
      selectHouseById(house.id);
    });
    houseMarkersById.set(house.id, marker);
    markers.push(marker);
  }

  for (const location of locations.value) {
    const position = locationPosition(location);
    if (!position) continue;

    const marker = new amap.value.Marker({
      position,
      title: location.name,
      label: {
        content: `<div class="map-marker-label location">${location.name}</div>`,
        direction: 'top'
      }
    });

    marker.on('click', () => {
      focusLocation(location, position);
    });
    markers.push(marker);
  }

  if (markers.length) {
    map.value.add(markers);
  }
  mapPointMarkers = markers;

  renderPointRoute();
  renderScheduleRoutePolyline();
}

function fitSearchResultView() {
  if (!map.value || !isSearchResultMode.value) return false;

  const resultMarkers = searchResultHouses.value
    .map((house) => houseMarkersById.get(house.id))
    .filter((marker): marker is AMapMarker => Boolean(marker));

  if (!resultMarkers.length) return false;

  map.value.setFitView(resultMarkers);
  emitBounds();
  return true;
}

// ==================== 路线 ====================

let activePointRouteRequestId = 0;
const pointRoutePlanners = new Set<AMapRoutePlanner>();
let activeScheduleRouteRequestId = 0;
let scheduleRoutePlanner: AMapRoutePlanner | undefined;
let scheduleRouteMarkers: AMapMarker[] = [];
let scheduleRouteInfoWindow: AMapInfoWindow | undefined;

/** 清除路线折线和信息窗口 */
function clearPointRoutePlanner() {
  activePointRouteRequestId += 1;
  for (const planner of pointRoutePlanners) {
    planner.clear?.();
  }
  pointRoutePlanners.clear();
  if (pointRouteResultPanel.value) {
    pointRouteResultPanel.value.innerHTML = '';
  }
}

function clearScheduleRoutePolyline() {
  activeScheduleRouteRequestId += 1;
  scheduleRoutePlanner?.clear?.();
  scheduleRoutePlanner = undefined;

  for (const marker of scheduleRouteMarkers) {
    map.value?.remove(marker);
  }
  scheduleRouteMarkers = [];

  if (scheduleRouteInfoWindow) {
    scheduleRouteInfoWindow.close();
    scheduleRouteInfoWindow = undefined;
  }
}

function routePluginName(mode: CommuteMode) {
  if (mode === 'walking') return 'AMap.Walking';
  if (mode === 'cycling') return 'AMap.Riding';
  if (mode === 'transit') return 'AMap.Transfer';
  return 'AMap.Driving';
}

function createRoutePlanner(mode: CommuteMode) {
  if (!map.value || !amap.value) return undefined;

  const options: Record<string, unknown> = {
    map: map.value,
    panel: pointRouteResultPanel.value,
    autoFitView: true,
    hideMarkers: false,
    extensions: 'all'
  };

  if (mode === 'transit') {
    return new amap.value.Transfer({ ...options, city: '全国' });
  }
  if (mode === 'walking') {
    return new amap.value.Walking(options);
  }
  if (mode === 'cycling') {
    return new amap.value.Riding(options);
  }

  return new amap.value.Driving({ ...options, showTraffic: true });
}

function firstRouteSummary(result: AMapRouteSearchResult) {
  return result.routes?.[0] ?? result.plans?.[0];
}

function renderPointRoute() {
  if (!map.value || !amap.value || mode.value !== 'point-route' || !pointRouteOrigin.value || !pointRouteDestination.value) return;

  clearPointRoutePlanner();
  const requestId = activePointRouteRequestId;
  const routeMode = commuteMode.value;
  const originPoint = pointRouteOrigin.value;
  const destinationPoint = pointRouteDestination.value;
  const pluginName = routePluginName(routeMode);
  amap.value.plugin(pluginName, () => {
    if (requestId !== activePointRouteRequestId || mode.value !== 'point-route') return;

    const planner = createRoutePlanner(routeMode);
    if (!planner) return;

    pointRoutePlanners.add(planner);

    const origin: AMapLngLat = new amap.value!.LngLat(originPoint.longitude, originPoint.latitude);
    const destination: AMapLngLat = new amap.value!.LngLat(destinationPoint.longitude, destinationPoint.latitude);
    planner.search(origin, destination, (status: AMapRouteStatus, result: AMapRouteSearchResult | string) => {
      if (requestId !== activePointRouteRequestId || commuteMode.value !== routeMode) {
        planner.clear?.();
        pointRoutePlanners.delete(planner);
        return;
      }
      if (status !== 'complete' || typeof result === 'string') return;

      const summary = firstRouteSummary(result);
      if (!summary?.distance || !summary.time) return;

      mapStore.setPointRouteResult({
        origin: `${originPoint.longitude},${originPoint.latitude}`,
        destination: `${destinationPoint.longitude},${destinationPoint.latitude}`,
        distance: summary.distance,
        duration: summary.time,
        mode: routeMode
      });
    });
  });
}

function renderScheduleRoutePolyline() {
  if (!map.value || !amap.value || !scheduleRoutePlan.value) return;

  clearScheduleRoutePolyline();
  const requestId = activeScheduleRouteRequestId;
  const plan = scheduleRoutePlan.value;
  const originPoint = new amap.value.LngLat(plan.origin.longitude!, plan.origin.latitude!);
  const destinationItem = plan.items[plan.items.length - 1];
  if (!destinationItem) return;

  const destinationPoint = new amap.value.LngLat(destinationItem.house.longitude!, destinationItem.house.latitude!);
  const waypoints = plan.items
    .slice(0, -1)
    .map((item) => new amap.value!.LngLat(item.house.longitude!, item.house.latitude!));

  const AMap = amap.value;
  scheduleRouteMarkers = plan.items.map((item, index) => {
    const marker = new AMap.Marker({
      position: [item.house.longitude!, item.house.latitude!],
      title: item.house.name,
      label: {
        content: `<div class="map-marker-label route-stop">${index + 1}</div>`,
        direction: 'top'
      }
    });
    marker.on('click', () => {
      selectHouseById(item.house.id);
    });
    return marker;
  });
  map.value.add(scheduleRouteMarkers);

  amap.value.plugin('AMap.Driving', () => {
    if (!map.value || !amap.value || requestId !== activeScheduleRouteRequestId || scheduleRoutePlan.value !== plan) return;

    scheduleRoutePlanner = new amap.value.Driving({
      map: map.value,
      autoFitView: true,
      hideMarkers: true,
      extensions: 'all',
      showTraffic: true
    });

    scheduleRoutePlanner.search(originPoint, destinationPoint, { waypoints }, (status, result) => {
      if (!map.value || !amap.value || requestId !== activeScheduleRouteRequestId || scheduleRoutePlan.value !== plan) {
        scheduleRoutePlanner?.clear?.();
        return;
      }

      const summary = status === 'complete' && typeof result !== 'string' ? firstRouteSummary(result) : undefined;
      const distance = summary?.distance ?? plan.totalDistance;
      scheduleRouteInfoWindow = new amap.value.InfoWindow({
        content: `<div class="map-route-label">当日路线 · ${formatDistanceShort(distance)}</div>`,
        offset: new amap.value.Pixel(0, 0)
      });
      scheduleRouteInfoWindow.open(map.value, [destinationItem.house.longitude!, destinationItem.house.latitude!]);
    });
  });
}

// ==================== 地图生命周期 ====================

function resizeMap() {
  map.value?.resize?.();
}

function fitView() {
  if (!map.value) return false;

  map.value.setFitView();
  emitBounds();
  return true;
}

function refreshBounds() {
  if (!map.value) return false;

  emitBounds();
  return true;
}

function clearRoute() {
  mapStore.clearRoute();
}

function clearSearchResults() {
  mapStore.clearHouseSearchResults();
}

function showRouteByHouseId(houseId: string) {
  return mapStore.showRoute(houseId);
}

onMounted(async () => {
  if (!mapContainer.value) return;

  try {
    amap.value = await loadAmap();
    await nextTick();
    map.value = new amap.value.Map(mapContainer.value, {
      zoom: defaultMapZoom,
      center: [116.397428, 39.90923],
      viewMode: '2D',
      mapStyle: 'amap://styles/normal',
      animateEnable: false,
      zooms: [3, 20]
    });
    map.value.on('moveend', scheduleBoundsChange);
    map.value.on('zoomend', scheduleBoundsChange);
    map.value.on('click', closeContextMenu);
    map.value.on('rightclick', openContextMenu);
    setupNativeControls();
    resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(mapContainer.value);
    renderMarkers();
    window.setTimeout(() => {
      if (!applyInitialFocusLocation()) {
        map.value?.setFitView();
      }
      emitBounds();
    }, 0);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '地图加载失败';
    ElMessage.warning(loadError.value);
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(boundsTimer);
  resizeObserver?.disconnect();
  map.value?.destroy();
});

// ==================== 响应式监听 ====================

watch(
  [houses, locations],
  () => {
    renderMarkers();
    if (isSearchResultMode.value) {
      fitSearchResultView();
    }
    if (applyInitialFocusLocation()) {
      emitBounds();
    }
  },
  { deep: true }
);

watch(
  [mode, searchResultHouses],
  () => {
    renderMarkers();
    if (isSearchResultMode.value) {
      fitSearchResultView();
    }
  },
  { deep: true }
);

watch(
  [selectedHouseId, selectedHouseFocusKey],
  ([id]) => {
    const house = visibleHouses.value.find((item) => item.id === id) ?? houses.value.find((item) => item.id === id);
    const position = house ? housePosition(house) : undefined;
    if (!house || !position) return;
    focusHouse(house, position);
  }
);

watch(
  [mode, pointRouteOrigin, pointRouteDestination, pointRouteRequestKey, commuteMode],
  async () => {
    if (!map.value || !amap.value) return;
    nativeRouteCollapse.value = [];
    await nextTick();
    clearPointRoutePlanner();
    clearScheduleRoutePolyline();
    renderPointRoute();
  },
  { deep: true }
);

watch(
  scheduleRoutePlan,
  () => {
    if (!map.value || !amap.value) return;
    clearPointRoutePlanner();
    clearScheduleRoutePolyline();
    renderScheduleRoutePolyline();
  }
);

defineExpose({
  resize: resizeMap,
  fitView,
  refreshBounds,
  selectHouseById,
  focusHouseById,
  focusLocationById,
  focusFocusLocation,
  clearRoute,
  clearSearchResults,
  showRouteByHouseId
});
</script>

<template>
  <section class="map-panel">
    <div v-if="loadError" class="map-empty">
      <el-icon><LocationIcon /></el-icon>
      <strong>高德地图未就绪</strong>
      <span>{{ loadError }}</span>
    </div>
    <div ref="mapContainer" class="amap-container" @contextmenu.prevent />
    <MapPointRoutePanel
      v-if="mode === 'point-route' && pointRouteOrigin && pointRouteDestination"
      @click.stop
    >
      <template #native-route-result>
        <el-collapse v-model="nativeRouteCollapse" class="map-native-route-collapse">
          <el-collapse-item title="路线详情" name="route-detail">
            <div ref="pointRouteResultPanel" class="map-native-route-result-panel" />
          </el-collapse-item>
        </el-collapse>
      </template>
    </MapPointRoutePanel>
    <div
      v-if="contextMenu.visible"
      class="map-context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <button type="button" @click="createHouseFromContextMenu">
        <el-icon><HouseIcon /></el-icon>
        <span>新增房源</span>
      </button>
      <button type="button" @click="createLocationFromContextMenu">
        <el-icon><OfficeBuilding /></el-icon>
        <span>新增地点</span>
      </button>
    </div>
    <button
      v-if="mode === 'point-route' || scheduleRoutePlan"
      class="map-panel-close-btn map-clear-route-btn"
      title="关闭路线"
      @click.stop="clearRoute"
    >
      <el-icon><Close /></el-icon>
    </button>
    <button
      v-if="isSearchResultMode"
      class="map-panel-close-btn map-clear-search-results-btn"
      title="退出搜索结果"
      @click.stop="clearSearchResults"
    >
      <el-icon><Close /></el-icon>
    </button>
    <button
      v-if="hasFocusLocation"
      class="map-panel-close-btn map-focus-location-btn"
      title="回到焦点地点"
      @click.stop="focusFocusLocation"
    >
      <el-icon><Aim /></el-icon>
    </button>
  </section>
</template>
