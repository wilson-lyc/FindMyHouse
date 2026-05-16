<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { Close, House as HouseIcon, Location as LocationIcon, OfficeBuilding } from '@element-plus/icons-vue';
import { formatCurrency } from '../../lib/format';
import { useMapStore } from '../../stores/mapStore';
import { loadAmap, type AMapInfoWindow, type AMapMap, type AMapMarker, type AMapNamespace, type AMapPolyline } from '../../lib/map/amap-loader';
import type { House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import type { Location as KeyLocation } from '../../model/location/location';
import { locationCategoryLabels } from '../../model/location/location';

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
const { houses, locations, selectedHouseId, selectedHouseFocusKey, routeData, highlightedHouseIds } = storeToRefs(mapStore);

// ==================== 地图实例 ====================

const mapContainer = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');
const isSearchResultMode = computed(() => highlightedHouseIds.value.length > 0);

const houseFocusZoom = 16;
const locationFocusZoom = 14;

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
  return `<div class="map-info map-house-info"><button class="map-info-close-button" type="button" aria-label="关闭">×</button><strong>${house.name}</strong><span>${house.address}</span><span>${formatCurrency(house.rentPrice)} · ${statusLabels[house.status]}</span><div class="map-info-actions"><button class="el-button el-button--small map-info-detail-button" data-house-id="${house.id}" type="button"><span>详情</span></button></div></div>`;
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
    const buttons = document.querySelectorAll<HTMLButtonElement>('.map-info-detail-button');
    for (const button of buttons) {
      if (button.dataset.houseId === house.id) {
        button.onclick = () => emit('editHouse', house);
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

  if (map.value.setZoomAndCenter) {
    map.value.setZoomAndCenter(houseFocusZoom, position, true, 0);
  } else {
    map.value.setZoom?.(houseFocusZoom, true, 0);
    map.value.setCenter(position, true, 0);
  }

  openHouseInfoWindow(house, position);
}

function focusHouseById(houseId: string) {
  const house = houses.value.find((item) => item.id === houseId);
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

  if (map.value.setZoomAndCenter) {
    map.value.setZoomAndCenter(locationFocusZoom, position, true, 0);
  } else {
    map.value.setZoom?.(locationFocusZoom, true, 0);
    map.value.setCenter(position, true, 0);
  }

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
  if (!focusLocation) return false;

  return focusLocationById(focusLocation.id);
}

/** 首次加载时跳转到焦点地点 */
function applyInitialFocusLocation() {
  if (!map.value || hasAppliedInitialFocus) return false;

  const focusLocation = locations.value.find((location) => location.isFocus);
  const position = focusLocation ? locationPosition(focusLocation) : undefined;
  if (!focusLocation || !position) return false;

  if (map.value.setZoomAndCenter) {
    map.value.setZoomAndCenter(locationFocusZoom, position, true, 0);
  } else {
    map.value.setZoom?.(locationFocusZoom, true, 0);
    map.value.setCenter(position, true, 0);
  }

  hasAppliedInitialFocus = true;
  return true;
}

/** 渲染房源和地点的大头针；搜索结果模式下只渲染匹配房源。 */
let houseMarkersById = new Map<string, AMapMarker>();

function renderMarkers() {
  if (!map.value || !amap.value) return;

  map.value.clearMap();
  const markers = [];
  houseMarkersById = new Map();

  const highlightedIds = new Set(highlightedHouseIds.value ?? []);
  const visibleHouses = highlightedIds.size > 0 ? houses.value.filter((house) => highlightedIds.has(house.id)) : houses.value;

  for (const house of visibleHouses) {
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

  if (highlightedIds.size === 0) {
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
  }

  if (markers.length) {
    map.value.add(markers);
  }

  renderRoutePolyline();
}

function fitSearchResultView() {
  if (!map.value || highlightedHouseIds.value.length === 0) return false;

  const resultMarkers = highlightedHouseIds.value
    .map((houseId) => houseMarkersById.get(houseId))
    .filter((marker): marker is AMapMarker => Boolean(marker));

  if (!resultMarkers.length) return false;

  map.value.setFitView(resultMarkers);
  emitBounds();
  return true;
}

// ==================== 路线 ====================

let routePolyline: AMapPolyline | undefined;
let routeInfoWindow: AMapInfoWindow | undefined;

function formatDistanceShort(meters: number): string {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + 'km';
  }
  return Math.round(meters) + 'm';
}

function formatDurationShort(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours + 'h' + (mins > 0 ? mins + 'min' : '');
    }
    return minutes + 'min';
  }
  return Math.round(seconds) + 's';
}

/** 清除路线折线和信息窗口 */
function clearRoutePolyline() {
  if (routePolyline) {
    routePolyline.setMap(null);
    routePolyline = undefined;
  }
  if (routeInfoWindow) {
    routeInfoWindow.close();
    routeInfoWindow = undefined;
  }
}

/** 绘制路线折线并显示距离时长标签 */
function renderRoutePolyline() {
  if (!map.value || !amap.value || !routeData.value) return;

  const path = routeData.value.polyline;
  if (!path || path.length < 2) return;

  clearRoutePolyline();

  routePolyline = new amap.value.Polyline({
    path,
    strokeColor: getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim(),
    strokeWeight: 5,
    strokeOpacity: 0.8,
    lineJoin: 'round',
    lineCap: 'round'
  });

  routePolyline.setMap(map.value);

  map.value?.setFitView([routePolyline]);

  const midIndex = Math.floor(path.length / 2);
  const midPoint = path[midIndex];

  const routeInfoContent = `<div class="map-route-label">${formatDistanceShort(routeData.value.distance)} · ${formatDurationShort(routeData.value.duration)}</div>`;
  routeInfoWindow = new amap.value.InfoWindow({
    content: routeInfoContent,
    offset: new amap.value.Pixel(0, 0)
  });
  routeInfoWindow.open(map.value, midPoint);
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
  mapStore.clearHighlightedHouseIds();
}

function showRouteByHouseId(houseId: string) {
  return mapStore.showRoute(houseId);
}

function setHighlightedHouseIds(houseIds: string[]) {
  mapStore.setHighlightedHouseIds(houseIds);
}

onMounted(async () => {
  if (!mapContainer.value) return;

  try {
    amap.value = await loadAmap();
    await nextTick();
    map.value = new amap.value.Map(mapContainer.value, {
      zoom: 11,
      center: [116.397428, 39.90923],
      viewMode: '2D',
      animateEnable: false
    });
    map.value.on('moveend', scheduleBoundsChange);
    map.value.on('zoomend', scheduleBoundsChange);
    map.value.on('click', closeContextMenu);
    map.value.on('rightclick', openContextMenu);
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
    if (highlightedHouseIds.value.length > 0) {
      fitSearchResultView();
    }
    if (applyInitialFocusLocation()) {
      emitBounds();
    }
  },
  { deep: true }
);

watch(
  highlightedHouseIds,
  () => {
    renderMarkers();
    if (highlightedHouseIds.value.length > 0) {
      fitSearchResultView();
    }
  },
  { deep: true }
);

watch(
  [selectedHouseId, selectedHouseFocusKey],
  ([id]) => {
    const house = houses.value.find((item) => item.id === id);
    const position = house ? housePosition(house) : undefined;
    if (!house || !position) return;
    focusHouse(house, position);
  }
);

watch(
  routeData,
  () => {
    if (!map.value || !amap.value) return;
    clearRoutePolyline();
    renderRoutePolyline();
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
  showRouteByHouseId,
  setHighlightedHouseIds
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
      v-if="routeData"
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
  </section>
</template>
