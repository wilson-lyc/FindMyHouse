<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { Close, Location } from '@element-plus/icons-vue';
import { formatCurrency } from '../../lib/format';
import { useMapStore } from '../../stores/mapStore';
import { loadAmap, type AMapInfoWindow, type AMapMap, type AMapNamespace, type AMapPolyline } from '../../lib/map/amap-loader';
import type { House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import type { Location as KeyLocation } from '../../model/location/location';
import { locationCategoryLabels } from '../../model/location/location';
import type { MapBoundsFilter } from '../../model/map/geocode';

const emit = defineEmits<{
  boundsChange: [bounds: MapBoundsFilter];
  selectHouse: [house: House];
  editHouse: [house: House];
  clearRoute: [];
}>();

const mapStore = useMapStore();
const { houses, locations, selectedHouseId, selectedHouseFocusKey, routeData, highlightedHouseIds } = storeToRefs(mapStore);

const mapContainer = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');
let infoWindow: AMapInfoWindow | undefined;
let boundsTimer: number | undefined;
let resizeObserver: ResizeObserver | undefined;
let routePolyline: AMapPolyline | undefined;
let routeInfoWindow: AMapInfoWindow | undefined;
const houseFocusZoom = 16;
const locationFocusZoom = 14;
let hasAppliedInitialFocus = false;

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

function emitBounds() {
  if (!map.value) return;
  const bounds = map.value.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  emit('boundsChange', {
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
  return `<div class="map-info map-house-info"><strong>${house.name}</strong><span>${house.address}</span><span>${formatCurrency(house.rentPrice)} · ${statusLabels[house.status]}</span><div class="map-info-actions"><button class="map-info-detail-button" data-house-id="${house.id}" type="button">详情</button></div></div>`;
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
  bindHouseInfoAction(house);
}

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

function applyInitialFocusLocation() {
  if (!map.value || hasAppliedInitialFocus) return false;

  const focusLocation = locations.value.find((location) => location.isFocus);
  const position = focusLocation ? locationPosition(focusLocation) : undefined;
  if (!position) return false;

  if (map.value.setZoomAndCenter) {
    map.value.setZoomAndCenter(locationFocusZoom, position);
  } else {
    map.value.setZoom?.(locationFocusZoom);
    map.value.setCenter(position);
  }

  hasAppliedInitialFocus = true;
  return true;
}

function renderMarkers() {
  if (!map.value || !amap.value) return;

  map.value.clearMap();
  const markers = [];

  const highlightedIds = new Set(highlightedHouseIds.value ?? []);

  for (const house of houses.value) {
    const position = housePosition(house);
    if (!position) continue;

    const isHighlighted = highlightedIds.has(house.id);
    const labelClass = isHighlighted ? 'map-marker-label house highlighted' : 'map-marker-label house';

    const marker = new amap.value.Marker({
      position,
      title: house.name,
      label: {
        content: `<div class="${labelClass}">¥${house.rentPrice}</div>`,
        direction: 'top'
      }
    });

    marker.on('click', () => {
      emit('selectHouse', house);
      openHouseInfoWindow(house, position);
    });
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
      createInfoWindow(
        `<div class="map-info"><strong>${location.name}</strong><span>${locationCategoryLabels[location.category]} · ${location.address}</span></div>`,
        position
      );
    });
    markers.push(marker);
  }

  if (markers.length) {
    map.value.add(markers);
  }

  renderRoutePolyline();
}

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

function renderRoutePolyline() {
  if (!map.value || !amap.value || !routeData.value) return;

  const path = routeData.value.polyline;
  if (!path || path.length < 2) return;

  clearRoutePolyline();

  routePolyline = new amap.value.Polyline({
    path,
    strokeColor: '#2b7de1',
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

function resizeMap() {
  map.value?.resize?.();
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

watch(
  [houses, locations],
  () => {
    renderMarkers();
    if (applyInitialFocusLocation()) {
      emitBounds();
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

onBeforeUnmount(() => {
  window.clearTimeout(boundsTimer);
  resizeObserver?.disconnect();
  map.value?.destroy();
});
</script>

<template>
  <section class="map-panel">
    <div v-if="loadError" class="map-empty">
      <el-icon><Location /></el-icon>
      <strong>高德地图未就绪</strong>
      <span>{{ loadError }}</span>
    </div>
    <div ref="mapContainer" class="amap-container" />
    <button
      v-if="routeData"
      class="map-clear-route-btn"
      title="关闭路线"
      @click.stop="emit('clearRoute')"
    >
      <el-icon><Close /></el-icon>
    </button>
  </section>
</template>
