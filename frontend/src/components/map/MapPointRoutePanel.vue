<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { Location, Switch } from '@element-plus/icons-vue';
import { formatDistanceShort, formatDurationShort } from '../../lib/map/route-format';
import { commuteModeLabels, type CommuteMode } from '../../model/map/geocode';
import { useMapStore, type MapRoutePoint } from '../../stores/mapStore';

const mapStore = useMapStore();
const { houses, locations, commuteMode, pointRouteOrigin, pointRouteDestination, routeData } = storeToRefs(mapStore);

const originKey = ref('');
const destinationKey = ref('');

const pointOptions = computed(() => {
  const houseOptions = houses.value
    .filter((house) => house.longitude !== undefined && house.latitude !== undefined)
    .map((house) => ({
      key: `house:${house.id}`,
      point: {
        id: house.id,
        kind: 'house' as const,
        name: house.name,
        address: house.address,
        longitude: house.longitude!,
        latitude: house.latitude!
      }
    }));

  const locationOptions = locations.value
    .filter((location) => location.longitude !== undefined && location.latitude !== undefined)
    .map((location) => ({
      key: `location:${location.id}`,
      point: {
        id: location.id,
        kind: 'location' as const,
        name: location.name,
        address: location.address,
        longitude: location.longitude!,
        latitude: location.latitude!
      }
    }));

  return [...houseOptions, ...locationOptions];
});

const selectedOrigin = computed(() => pointOptions.value.find((option) => option.key === originKey.value)?.point ?? null);
const selectedDestination = computed(
  () => pointOptions.value.find((option) => option.key === destinationKey.value)?.point ?? null
);

const routeSummary = computed(() => {
  if (!routeData.value) return '';

  return `${formatDistanceShort(routeData.value.distance)} · ${formatDurationShort(routeData.value.duration)}`;
});

function pointKey(point: MapRoutePoint | null) {
  return point ? mapStore.routePointKey(point) : '';
}

function refreshRoute() {
  const origin = selectedOrigin.value;
  const destination = selectedDestination.value;
  if (!origin || !destination) return;

  if (originKey.value === destinationKey.value) {
    ElMessage.info('起点和终点不能相同');
    return;
  }

  mapStore.showPointRoute(origin, destination);
}

function changeCommuteMode(value: string | number | boolean | undefined) {
  if (typeof value !== 'string') return;

  mapStore.setCommuteMode(value as CommuteMode);
  refreshRoute();
}

function swapPoints() {
  if (!originKey.value || !destinationKey.value) return;

  const nextOrigin = destinationKey.value;
  destinationKey.value = originKey.value;
  originKey.value = nextOrigin;
  refreshRoute();
}

watch(
  [pointRouteOrigin, pointRouteDestination],
  ([origin, destination]) => {
    originKey.value = pointKey(origin);
    destinationKey.value = pointKey(destination);
  },
  { immediate: true }
);
</script>

<template>
  <section class="map-point-route-panel" @click.stop>
    <div class="map-point-route-row">
      <span class="map-point-route-label">起点</span>
      <el-select
        v-model="originKey"
        size="small"
        filterable
        placeholder="选择起点"
        @change="refreshRoute"
      >
        <el-option-group label="房源">
          <el-option
            v-for="option in pointOptions.filter((item) => item.point.kind === 'house')"
            :key="option.key"
            :label="option.point.name"
            :value="option.key"
          />
        </el-option-group>
        <el-option-group label="地点">
          <el-option
            v-for="option in pointOptions.filter((item) => item.point.kind === 'location')"
            :key="option.key"
            :label="option.point.name"
            :value="option.key"
          />
        </el-option-group>
      </el-select>
    </div>
    <div class="map-point-route-row">
      <span class="map-point-route-label">终点</span>
      <el-select
        v-model="destinationKey"
        size="small"
        filterable
        placeholder="选择终点"
        @change="refreshRoute"
      >
        <el-option-group label="房源">
          <el-option
            v-for="option in pointOptions.filter((item) => item.point.kind === 'house')"
            :key="option.key"
            :label="option.point.name"
            :value="option.key"
          />
        </el-option-group>
        <el-option-group label="地点">
          <el-option
            v-for="option in pointOptions.filter((item) => item.point.kind === 'location')"
            :key="option.key"
            :label="option.point.name"
            :value="option.key"
          />
        </el-option-group>
      </el-select>
    </div>
    <div class="map-point-route-row">
      <span class="map-point-route-label">方式</span>
      <el-select
        :model-value="commuteMode"
        size="small"
        placeholder="交通方式"
        @change="changeCommuteMode"
      >
        <el-option
          v-for="[mode, label] in Object.entries(commuteModeLabels)"
          :key="mode"
          :label="label"
          :value="mode"
        />
      </el-select>
    </div>
    <div class="map-point-route-footer">
      <span>
        <el-icon><Location /></el-icon>
        {{ routeSummary }}
      </span>
      <el-button text size="small" :icon="Switch" :disabled="!originKey || !destinationKey" @click="swapPoints" />
    </div>
    <div v-if="$slots['native-route-result']" class="map-point-route-native-slot">
      <slot name="native-route-result" />
    </div>
  </section>
</template>
