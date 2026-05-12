<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Location } from '@element-plus/icons-vue';
import { formatCurrency } from '../../lib/format';
import { loadAmap, type AMapInfoWindow, type AMapMap, type AMapNamespace } from '../../lib/map/amap-loader';
import type { House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import type { Location as KeyLocation } from '../../model/location/location';
import { locationCategoryLabels } from '../../model/location/location';
import type { MapBoundsFilter } from '../../model/map/geocode';

const props = defineProps<{
  houses: House[];
  locations: KeyLocation[];
  selectedHouseId?: string;
  selectedHouseFocusKey?: number;
}>();

const emit = defineEmits<{
  boundsChange: [bounds: MapBoundsFilter];
  selectHouse: [house: House];
  editHouse: [house: House];
}>();

const mapContainer = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');
let infoWindow: AMapInfoWindow | undefined;
let boundsTimer: number | undefined;
let resizeObserver: ResizeObserver | undefined;
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
  infoWindow = new amap.value.InfoWindow({
    content
  });
  infoWindow.open(map.value, position);
}

function houseInfoContent(house: House) {
  return `<div class="map-info"><strong>${house.name}</strong><span>${house.address}</span><span>${formatCurrency(house.rentPrice)} · ${statusLabels[house.status]}</span><div class="map-info-actions"><button class="el-button el-button--primary el-button--small map-info-detail-button" data-house-id="${house.id}" type="button"><span>详情</span></button></div></div>`;
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
    map.value.setZoomAndCenter(houseFocusZoom, position);
  } else {
    map.value.setZoom?.(houseFocusZoom);
    map.value.setCenter(position);
  }

  openHouseInfoWindow(house, position);
}

function applyInitialFocusLocation() {
  if (!map.value || hasAppliedInitialFocus) return false;

  const focusLocation = props.locations.find((location) => location.isFocus);
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

  for (const house of props.houses) {
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
      emit('selectHouse', house);
      openHouseInfoWindow(house, position);
    });
    markers.push(marker);
  }

  for (const location of props.locations) {
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
      viewMode: '2D'
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
  () => [props.houses, props.locations],
  () => {
    renderMarkers();
    if (applyInitialFocusLocation()) {
      emitBounds();
    }
  },
  { deep: true }
);

watch(
  () => [props.selectedHouseId, props.selectedHouseFocusKey] as const,
  ([id]) => {
    const house = props.houses.find((item) => item.id === id);
    const position = house ? housePosition(house) : undefined;
    if (!house || !position) return;
    focusHouse(house, position);
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
  </section>
</template>
