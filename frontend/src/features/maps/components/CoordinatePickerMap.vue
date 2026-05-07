<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Location } from '@element-plus/icons-vue';
import { loadAmap, type AMapMap, type AMapMouseEvent, type AMapNamespace } from '../lib/amap-loader';

const props = defineProps<{
  active?: boolean;
  longitude?: number;
  latitude?: number;
}>();

const emit = defineEmits<{
  change: [coordinate: { longitude: number; latitude: number }];
}>();

const mapContainer = ref<HTMLDivElement>();
const map = ref<AMapMap>();
const amap = ref<AMapNamespace>();
const loadError = ref('');

const defaultCenter: [number, number] = [116.397428, 39.90923];

function currentCenter(): [number, number] {
  if (props.longitude !== undefined && props.latitude !== undefined) {
    return [props.longitude, props.latitude];
  }

  return defaultCenter;
}

function eventCoordinate(event?: AMapMouseEvent): [number, number] | undefined {
  const lnglat = event?.lnglat;
  if (!lnglat) return undefined;

  const longitude = typeof lnglat.getLng === 'function' ? lnglat.getLng() : lnglat.lng;
  const latitude = typeof lnglat.getLat === 'function' ? lnglat.getLat() : lnglat.lat;
  if (longitude === undefined || latitude === undefined) return undefined;

  return [longitude, latitude];
}

function renderMarker() {
  if (!map.value || !amap.value) return;

  map.value.clearMap();
  if (props.longitude === undefined || props.latitude === undefined) return;

  const position: [number, number] = [props.longitude, props.latitude];
  map.value.add(
    new amap.value.Marker({
      position,
      title: '房源坐标',
      label: {
        content: '<div class="map-marker-label listing">房源</div>',
        direction: 'top'
      }
    })
  );
}

function syncMapToProps() {
  if (!map.value) return;

  map.value.setCenter(currentCenter());
  renderMarker();
}

function selectCoordinate(position: [number, number]) {
  emit('change', {
    longitude: Number(position[0].toFixed(6)),
    latitude: Number(position[1].toFixed(6))
  });
}

async function initializeMap() {
  if (!mapContainer.value || map.value || props.active === false) return;

  try {
    amap.value = await loadAmap();
    await nextTick();
    map.value = new amap.value.Map(mapContainer.value, {
      zoom: props.longitude !== undefined && props.latitude !== undefined ? 16 : 11,
      center: currentCenter(),
      viewMode: '2D'
    });
    map.value.on('click', (event) => {
      const coordinate = eventCoordinate(event);
      if (coordinate) selectCoordinate(coordinate);
    });
    syncMapToProps();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '地图加载失败';
    ElMessage.warning(loadError.value);
  }
}

function scheduleInitialize() {
  window.setTimeout(() => {
    void initializeMap();
  }, 80);
}

watch(
  () => props.active,
  (active) => {
    if (active === false) return;
    scheduleInitialize();
  }
);

watch(
  () => [props.longitude, props.latitude] as const,
  () => syncMapToProps()
);

onMounted(scheduleInitialize);

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
