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
import { getTransitIsochrone } from '../../api/map/map-api';
import { useMapStore } from '../../stores/mapStore';
import {
  loadAmap,
  type AMapInfoWindow,
  type AMapLngLat,
  type AMapMap,
  type AMapMarker,
  type AMapNamespace,
  type AMapOverlay,
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
  commuteMode,
  isochroneRequest,
  distanceRingRequest
} = storeToRefs(mapStore);

// ==================== 地图实例 ====================

const mapContainer = ref<HTMLDivElement>();
const pointRouteResultPanel = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');
const mapOverlayLoading = ref(false);
const mapOverlayLoadingText = ref('正在绘制');
const nativeRouteCollapse = ref<string[]>([]);
const isSearchResultMode = computed(() => mode.value === 'house-search-results');
const isIsochroneMode = computed(() => mode.value === 'isochrone');
const isDistanceRingMode = computed(() => mode.value === 'distance-ring');
const visibleHouses = computed(() => (isSearchResultMode.value ? searchResultHouses.value : houses.value));
const hasFocusLocation = computed(() => locations.value.some((loc) => loc.isFocus));
const isochroneModeLabel = computed(() => {
  if (!isochroneRequest.value) return '';
  return isochroneRequest.value.mode === 'driving' ? '驾车等时圈' : '公交等时圈';
});
const ringLegend = computed<{
  title: string;
  items: Array<{ label: string; color: string }>;
} | null>(() => {
  if (isIsochroneMode.value && isochroneRequest.value) {
    return {
      title: isochroneModeLabel.value,
      items: isochroneMinutes.map((minutes, index) => ({
        label: `${minutes} 分钟`,
        color: isochroneStyles[index].strokeColor
      }))
    };
  }

  if (isDistanceRingMode.value && distanceRingRequest.value) {
    return {
      title: '等距圈',
      items: distanceRingRequest.value.radii.map((radius, index) => ({
        label: `${radius / 1000} km`,
        color: distanceRingStyles[Math.min(index, distanceRingStyles.length - 1)].strokeColor
      }))
    };
  }

  return null;
});
const activeCloseControl = computed<{
  title: string;
  placement: 'left' | 'right';
} | null>(() => {
  if (isSearchResultMode.value) {
    return {
      title: '退出搜索结果',
      placement: 'left'
    };
  }

  if (isIsochroneMode.value) {
    return {
      title: `关闭${isochroneModeLabel.value}`,
      placement: 'right'
    };
  }

  if (isDistanceRingMode.value) {
    return {
      title: '关闭等距圈',
      placement: 'right'
    };
  }

  if (mode.value === 'point-route' || scheduleRoutePlan.value) {
    return {
      title: '关闭路线',
      placement: 'right'
    };
  }

  return null;
});

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
  const disabledAttr = location.longitude === undefined || location.latitude === undefined ? ' disabled' : '';
  return `<div class="map-info"><button class="map-info-close-button" type="button" aria-label="关闭">×</button><strong>${location.name}</strong><span>${locationCategoryLabels[location.category]} · ${location.address}</span><div class="map-info-actions"><button class="el-button el-button--small map-info-isochrone-button" data-location-id="${location.id}" data-mode="driving" type="button"${disabledAttr}><span>驾车等时圈</span></button><button class="el-button el-button--small map-info-isochrone-button" data-location-id="${location.id}" data-mode="transit" type="button"${disabledAttr}><span>公交等时圈</span></button><button class="el-button el-button--small map-info-distance-ring-button" data-location-id="${location.id}" type="button"${disabledAttr}><span>等距圈</span></button></div></div>`;
}

function bindLocationInfoAction(location: KeyLocation) {
  window.setTimeout(() => {
    const isochroneButtons = document.querySelectorAll<HTMLButtonElement>('.map-info-isochrone-button');
    for (const button of isochroneButtons) {
      if (button.dataset.locationId === location.id) {
        button.onclick = () => {
          if (button.dataset.mode === 'driving' || button.dataset.mode === 'transit') {
            mapStore.showIsochrone(location, button.dataset.mode);
          }
        };
      }
    }
    const distanceRingButtons = document.querySelectorAll<HTMLButtonElement>('.map-info-distance-ring-button');
    for (const button of distanceRingButtons) {
      if (button.dataset.locationId === location.id) {
        button.onclick = () => mapStore.showDistanceRing(location);
      }
    }
  }, 0);
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
  bindLocationInfoAction(location);
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
let activeIsochroneRequestId = 0;
let isochroneOverlays: AMapOverlay[] = [];
let isochroneRoutePlanner: AMapRoutePlanner | undefined;
let distanceRingOverlays: AMapOverlay[] = [];

const isochroneMinutes = [10, 20, 30] as const;
const isochroneStyles = [
  { fillColor: '#2f80ed', strokeColor: '#1f5fbf', fillOpacity: 0.18 },
  { fillColor: '#22a06b', strokeColor: '#167a4f', fillOpacity: 0.14 },
  { fillColor: '#f59f00', strokeColor: '#b87503', fillOpacity: 0.12 }
] as const;
const distanceRingStyles = [
  { fillColor: '#6b7280', strokeColor: '#374151', fillOpacity: 0.08 },
  { fillColor: '#14b8a6', strokeColor: '#0f766e', fillOpacity: 0.06 },
  { fillColor: '#ef4444', strokeColor: '#b91c1c', fillOpacity: 0.05 }
] as const;

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

function clearIsochroneOverlays() {
  activeIsochroneRequestId += 1;
  mapOverlayLoading.value = false;
  isochroneRoutePlanner?.clear?.();
  isochroneRoutePlanner = undefined;
  if (isochroneOverlays.length) {
    map.value?.remove(isochroneOverlays);
  }
  isochroneOverlays = [];
}

function clearDistanceRingOverlays() {
  mapOverlayLoading.value = false;
  if (distanceRingOverlays.length) {
    map.value?.remove(distanceRingOverlays);
  }
  distanceRingOverlays = [];
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

function destinationByDistance(origin: [number, number], distanceMeters: number, bearingDegrees: number): [number, number] {
  const earthRadius = 6378137;
  const angularDistance = distanceMeters / earthRadius;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (origin[1] * Math.PI) / 180;
  const lng1 = (origin[0] * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function searchDrivingDuration(planner: AMapRoutePlanner, origin: [number, number], destination: [number, number]) {
  return new Promise<number | undefined>((resolve) => {
    const timeout = window.setTimeout(() => resolve(undefined), 8000);
    planner.search(origin, destination, (status, result) => {
      window.clearTimeout(timeout);
      if (status !== 'complete' || typeof result === 'string') {
        resolve(undefined);
        return;
      }
      resolve(firstRouteSummary(result)?.time);
    });
  });
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function createIsochronePolygon(path: Array<[number, number]>, styleIndex: number, zIndex: number) {
  if (!amap.value) return undefined;
  const style = isochroneStyles[styleIndex];
  return new amap.value.Polygon({
    path,
    fillColor: style.fillColor,
    fillOpacity: style.fillOpacity,
    strokeColor: style.strokeColor,
    strokeOpacity: 0.85,
    strokeWeight: 2,
    strokeStyle: 'solid',
    zIndex
  });
}

function addIsochroneLegendMarker(position: [number, number], label: string) {
  if (!amap.value) return undefined;
  return new amap.value.Marker({
    position,
    title: label,
    label: {
      content: `<div class="map-marker-label isochrone">${label}</div>`,
      direction: 'top'
    }
  });
}

function createDistanceCircle(center: [number, number], radius: number, styleIndex: number) {
  if (!amap.value) return undefined;
  const style = distanceRingStyles[styleIndex];
  return new amap.value.Circle({
    center,
    radius,
    fillColor: style.fillColor,
    fillOpacity: style.fillOpacity,
    strokeColor: style.strokeColor,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    strokeStyle: 'dashed',
    strokeDasharray: [8, 6],
    zIndex: 12 + styleIndex
  });
}

function addDistanceRingLabel(center: [number, number], radius: number) {
  if (!amap.value) return undefined;
  const position = destinationByDistance(center, radius, 90);
  const label = `${radius / 1000} km`;
  return new amap.value.Marker({
    position,
    title: label,
    label: {
      content: `<div class="map-marker-label distance-ring">${label}</div>`,
      direction: 'right'
    }
  });
}

async function renderDrivingIsochrone(location: KeyLocation, center: [number, number], requestId: number) {
  if (!amap.value || !map.value) {
    mapOverlayLoading.value = false;
    return;
  }

  const planner = new amap.value.Driving({
    extensions: 'base',
    hideMarkers: true,
    showTraffic: true
  });
  isochroneRoutePlanner = planner;

  const bearings = Array.from({ length: 12 }, (_, index) => index * 30);
  const overlays: AMapOverlay[] = [];

  for (const [minuteIndex, minutes] of isochroneMinutes.entries()) {
    if (requestId !== activeIsochroneRequestId) return;
    const maxRadius = minutes * 850;
    const targetSeconds = minutes * 60;
    const points = await mapWithConcurrency(bearings, 4, async (bearing) => {
      let low = maxRadius * 0.35;
      let high = maxRadius;

      for (let step = 0; step < 3; step += 1) {
        const mid = (low + high) / 2;
        const destination = destinationByDistance(center, mid, bearing);
        const duration = await searchDrivingDuration(planner, center, destination);
        if (duration !== undefined && duration <= targetSeconds) {
          low = mid;
        } else {
          high = mid;
        }
      }

      return destinationByDistance(center, low, bearing);
    });

    if (requestId !== activeIsochroneRequestId) return;
    const polygon = createIsochronePolygon(points, minuteIndex, 18 + minuteIndex);
    if (polygon) overlays.push(polygon);
  }

  const marker = addIsochroneLegendMarker(center, `${location.name} · 驾车等时圈`);
  if (marker) overlays.push(marker);
  if (requestId !== activeIsochroneRequestId || !map.value) return;

  isochroneOverlays = overlays;
  map.value.add(overlays);
  map.value.setFitView(overlays, false, [60, 60, 60, 60], 14);
  mapOverlayLoading.value = false;
}

async function renderTransitIsochrone(location: KeyLocation, center: [number, number], requestId: number) {
  if (!map.value) {
    mapOverlayLoading.value = false;
    return;
  }

  try {
    const result = await getTransitIsochrone(center[0], center[1], [...isochroneMinutes]);
    if (requestId !== activeIsochroneRequestId) return;

    const overlays: AMapOverlay[] = [];
    for (const ring of result.rings) {
      const minuteIndex = isochroneMinutes.findIndex((minutes) => minutes === ring.minutes);
      const polygon = createIsochronePolygon(ring.path, Math.max(0, minuteIndex), 18 + Math.max(0, minuteIndex));
      if (polygon) overlays.push(polygon);
    }

    const marker = addIsochroneLegendMarker(center, `${location.name} · 公交等时圈`);
    if (marker) overlays.push(marker);
    if (requestId !== activeIsochroneRequestId || !map.value) return;

    isochroneOverlays = overlays;
    if (overlays.length) {
      map.value.add(overlays);
      map.value.setFitView(overlays, false, [60, 60, 60, 60], 14);
    } else {
      ElMessage.warning('未获取到该地点的公交等时圈');
    }
  } catch (error) {
    if (requestId === activeIsochroneRequestId) {
      ElMessage.error(error instanceof Error ? error.message : '公交等时圈绘制失败');
    }
  } finally {
    if (requestId === activeIsochroneRequestId) {
      mapOverlayLoading.value = false;
    }
  }
}

function renderIsochrone() {
  clearIsochroneOverlays();
  if (!map.value || !amap.value || !isochroneRequest.value || mode.value !== 'isochrone') return;

  const { location, mode: isochroneMode, requestKey } = isochroneRequest.value;
  const position = locationPosition(location);
  if (!position) {
    ElMessage.warning('该地点缺少坐标，无法绘制等时圈');
    mapOverlayLoading.value = false;
    return;
  }

  const requestId = activeIsochroneRequestId;
  mapOverlayLoadingText.value = '正在绘制等时圈';
  mapOverlayLoading.value = true;
  map.value.setZoomAndCenter(locationFocusZoom, position, true, 0);

  if (isochroneMode === 'transit') {
    void renderTransitIsochrone(location, position, requestId);
  } else {
    void renderDrivingIsochrone(location, position, requestId);
  }

  if (requestKey > 0) {
    ElMessage.info(`正在绘制「${location.name}」${isochroneMode === 'driving' ? '驾车' : '公交'}等时圈`);
  }
}

function renderDistanceRing() {
  clearDistanceRingOverlays();
  if (!map.value || !amap.value || !distanceRingRequest.value || mode.value !== 'distance-ring') return;

  const { location, radii } = distanceRingRequest.value;
  const position = locationPosition(location);
  if (!position) {
    ElMessage.warning('该地点缺少坐标，无法绘制等距圈');
    mapOverlayLoading.value = false;
    return;
  }

  mapOverlayLoadingText.value = '正在绘制等距圈';
  mapOverlayLoading.value = true;

  const overlays: AMapOverlay[] = [];
  for (const [index, radius] of radii.entries()) {
    const circle = createDistanceCircle(position, radius, Math.min(index, distanceRingStyles.length - 1));
    const label = addDistanceRingLabel(position, radius);
    if (circle) overlays.push(circle);
    if (label) overlays.push(label);
  }

  const marker = addIsochroneLegendMarker(position, `${location.name} · 等距圈`);
  if (marker) overlays.push(marker);

  distanceRingOverlays = overlays;
  if (overlays.length) {
    map.value.add(overlays);
    map.value.setFitView(overlays, false, [60, 60, 60, 60], 14);
  }
  window.setTimeout(() => {
    if (mode.value === 'distance-ring') {
      mapOverlayLoading.value = false;
    }
  }, 150);
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

function closeActiveMapControl() {
  if (isSearchResultMode.value) {
    clearSearchResults();
    return;
  }

  if (isIsochroneMode.value) {
    mapStore.clearIsochrone();
    return;
  }

  if (isDistanceRingMode.value) {
    mapStore.clearDistanceRing();
    return;
  }

  clearRoute();
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
  clearIsochroneOverlays();
  clearDistanceRingOverlays();
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
    if (isDistanceRingMode.value) {
      renderDistanceRing();
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

watch(
  [mode, isochroneRequest],
  () => {
    if (!map.value || !amap.value) return;
    renderIsochrone();
  },
  { deep: true }
);

watch(
  [mode, distanceRingRequest],
  () => {
    if (!map.value || !amap.value) return;
    renderDistanceRing();
  },
  { deep: true }
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
  <section
    v-loading="mapOverlayLoading"
    class="map-panel"
    :element-loading-text="mapOverlayLoadingText"
    element-loading-background="rgb(255 255 255 / 72%)"
  >
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
    <div v-if="ringLegend" class="map-ring-legend" @click.stop>
      <strong>{{ ringLegend.title }}</strong>
      <div v-for="item in ringLegend.items" :key="item.label" class="map-ring-legend-item">
        <span class="map-ring-legend-swatch" :style="{ borderColor: item.color, backgroundColor: item.color }" />
        <span>{{ item.label }}</span>
      </div>
    </div>
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
      v-if="activeCloseControl"
      class="map-panel-close-btn"
      :class="`map-panel-close-btn--${activeCloseControl.placement}`"
      :title="activeCloseControl.title"
      @click.stop="closeActiveMapControl"
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
