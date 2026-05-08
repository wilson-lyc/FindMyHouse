<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Location, Money, OfficeBuilding } from '@element-plus/icons-vue';
import { formatCurrency } from '../../../shared/utils/format';
import type { Location as KeyLocation } from '../../locations/model/location';
import { locationCategoryLabels } from '../../locations/model/location';
import type { Listing } from '../../listings/model/listing';
import { statusLabels } from '../../listings/model/listing-status';
import { loadAmap, type AMapInfoWindow, type AMapMap, type AMapNamespace } from '../lib/amap-loader';
import type { MapBoundsFilter } from '../model/geocode';

const props = defineProps<{
  listings: Listing[];
  locations: KeyLocation[];
  selectedListingId?: string;
}>();

const emit = defineEmits<{
  boundsChange: [bounds: MapBoundsFilter];
  selectListing: [listing: Listing];
}>();

const mapContainer = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');
let infoWindow: AMapInfoWindow | undefined;
let boundsTimer: number | undefined;
let resizeObserver: ResizeObserver | undefined;

function listingPosition(listing: Listing): [number, number] | undefined {
  if (listing.longitude === undefined || listing.latitude === undefined) {
    return undefined;
  }

  return [listing.longitude, listing.latitude];
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

function renderMarkers() {
  if (!map.value || !amap.value) return;

  map.value.clearMap();
  const markers = [];

  for (const listing of props.listings) {
    const position = listingPosition(listing);
    if (!position) continue;

    const marker = new amap.value.Marker({
      position,
      title: listing.title,
      label: {
        content: `<div class="map-marker-label listing">¥${listing.rentPrice}</div>`,
        direction: 'top'
      }
    });

    marker.on('click', () => {
      emit('selectListing', listing);
      createInfoWindow(
        `<div class="map-info"><strong>${listing.title}</strong><span>${listing.address}</span><span>${formatCurrency(listing.rentPrice)} · ${statusLabels[listing.status]}</span></div>`,
        position
      );
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
      map.value?.setFitView();
      emitBounds();
    }, 0);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '地图加载失败';
    ElMessage.warning(loadError.value);
  }
});

watch(
  () => [props.listings, props.locations],
  () => renderMarkers(),
  { deep: true }
);

watch(
  () => props.selectedListingId,
  (id) => {
    const listing = props.listings.find((item) => item.id === id);
    const position = listing ? listingPosition(listing) : undefined;
    if (!listing || !position) return;
    createInfoWindow(
      `<div class="map-info"><strong>${listing.title}</strong><span>${listing.address}</span><span>${formatCurrency(listing.rentPrice)} · ${statusLabels[listing.status]}</span></div>`,
      position
    );
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
    <div class="map-stats">
      <span><el-icon><Money /></el-icon>{{ listings.filter((item) => item.latitude && item.longitude).length }} 套房源</span>
      <span><el-icon><OfficeBuilding /></el-icon>{{ locations.filter((item) => item.latitude && item.longitude).length }} 个地点</span>
    </div>
  </section>
</template>
