<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Location } from '@element-plus/icons-vue';
import { loadAmap, type AMapMap, type AMapMouseEvent, type AMapNamespace } from '../../lib/map/amap-loader';

const props = defineProps<{
  markerLabel?: string;
  markerClass?: string;
  markerTitle?: string;
}>();

const longitude = defineModel<number | undefined>('longitude');
const latitude = defineModel<number | undefined>('latitude');

const mapContainer = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');

const defaultCenter: [number, number] = [116.397428, 39.90923];

function currentCenter(): [number, number] {
  if (longitude.value !== undefined && latitude.value !== undefined) {
    return [longitude.value, latitude.value];
  }

  return defaultCenter;
}

function eventCoordinate(event?: AMapMouseEvent): [number, number] | undefined {
  const lnglat = event?.lnglat;
  if (!lnglat) return undefined;

  const lng = typeof lnglat.getLng === 'function' ? lnglat.getLng() : lnglat.lng;
  const lat = typeof lnglat.getLat === 'function' ? lnglat.getLat() : lnglat.lat;
  if (lng === undefined || lat === undefined) return undefined;

  return [lng, lat];
}

function renderMarker() {
  if (!map.value || !amap.value) return;

  map.value.clearMap();
  if (longitude.value === undefined || latitude.value === undefined) return;

  const position: [number, number] = [longitude.value, latitude.value];
  const markerLabel = props.markerLabel ?? '房源';
  const markerClass = props.markerClass ?? 'house';
  map.value.add(
    new amap.value.Marker({
      position,
      title: props.markerTitle ?? `${markerLabel}坐标`,
      label: {
        content: `<div class="map-marker-label ${markerClass}">${markerLabel}</div>`,
        direction: 'top'
      }
    })
  );
}

function syncCenterAndMarker() {
  if (!map.value) return;

  map.value.setCenter(currentCenter());
  renderMarker();
}

function selectCoordinate(position: [number, number]) {
  longitude.value = Number(position[0].toFixed(6));
  latitude.value = Number(position[1].toFixed(6));
}

async function initializeMap() {
  if (!mapContainer.value || map.value) return;

  try {
    amap.value = await loadAmap();
    await nextTick();
    map.value = new amap.value.Map(mapContainer.value, {
      zoom: longitude.value !== undefined && latitude.value !== undefined ? 16 : 11,
      center: currentCenter(),
      viewMode: '2D'
    });
    map.value.on('click', (event) => {
      const coordinate = eventCoordinate(event);
      if (coordinate) selectCoordinate(coordinate);
    });
    syncCenterAndMarker();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '地图加载失败';
    ElMessage.warning(loadError.value);
  }
}

onMounted(() => {
  window.setTimeout(() => {
    void initializeMap();
  }, 80);
});

watch([longitude, latitude], () => syncCenterAndMarker());

onBeforeUnmount(() => {
  map.value?.destroy();
});
</script>

<template>
  <div class="coordinate-picker-map">
    <div v-if="loadError" class="map-empty">
      <el-icon><Location /></el-icon>
      <strong>高德地图未就绪</strong>
      <span>{{ loadError }}</span>
    </div>
    <div ref="mapContainer" class="coordinate-amap-container" />
  </div>
</template>
