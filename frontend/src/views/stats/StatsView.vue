<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import { fetchHouses } from '../../api/house/house-api';
import { fetchLocations } from '../../api/location/location-api';
import { getDrivingRoute } from '../../api/map/map-api';
import { houseSourceChannelLabels, houseSourceChannels, houseStatuses, type House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import type { Location } from '../../model/location/location';
import type { DrivingRouteResult } from '../../model/map/geocode';
import { formatCurrency } from '../../lib/format';

const router = useRouter();

const loading = ref(true);
const rawHouses = ref<House[]>([]);
const rawLocations = ref<Location[]>([]);
const rawRoutes = ref<Map<string, DrivingRouteResult>>(new Map());

const statusChartRef = ref<HTMLDivElement | null>(null);
const rentChartRef = ref<HTMLDivElement | null>(null);
const sourceChartRef = ref<HTMLDivElement | null>(null);
const commuteChartRef = ref<HTMLDivElement | null>(null);
const charts = shallowRef<ECharts[]>([]);
let resizeObserver: ResizeObserver | undefined;

const houses = computed(() => rawHouses.value);
const routes = computed(() => rawRoutes.value);

const focusLocation = computed<Location | null>(() =>
  rawLocations.value.find((loc) => loc.isFocus && loc.latitude !== undefined && loc.longitude !== undefined) ?? null
);

const mappedCount = computed(() => houses.value.filter((house) => hasCoordinate(house)).length);
const averageRent = computed(() => average(houses.value.map((house) => house.rentPrice)));
const averageTotalCost = computed(() => average(houses.value.map((house) => getMonthlyTotalCost(house))));
const routeDurations = computed(() => Array.from(routes.value.values()).map((route) => route.duration / 60));
const averageCommute = computed(() => average(routeDurations.value));
const bestCommute = computed(() => {
  const houseWithRoute = houses.value
    .map((house) => ({ house, route: routes.value.get(house.id) }))
    .filter((item): item is { house: House; route: NonNullable<ReturnType<typeof routes.value.get>> } => Boolean(item.route))
    .sort((a, b) => a.route.duration - b.route.duration);

  return houseWithRoute[0];
});

const statusRows = computed(() =>
  houseStatuses.map((status) => ({
    name: statusLabels[status],
    value: houses.value.filter((house) => house.status === status).length
  }))
);

const sourceRows = computed(() =>
  houseSourceChannels.map((channel) => ({
    name: houseSourceChannelLabels[channel],
    value: houses.value.filter((house) => house.sourceChannel === channel).length
  }))
);

const rentBuckets = computed(() => {
  const buckets = [
    { name: '<3k', min: 0, max: 3000 },
    { name: '3-5k', min: 3000, max: 5000 },
    { name: '5-8k', min: 5000, max: 8000 },
    { name: '8-12k', min: 8000, max: 12000 },
    { name: '12k+', min: 12000, max: Infinity }
  ];

  return buckets.map((bucket) => ({
    name: bucket.name,
    value: houses.value.filter((house) => house.rentPrice >= bucket.min && house.rentPrice < bucket.max).length
  }));
});

const roomTypeRows = computed(() => {
  const counts = new Map<string, number>();
  houses.value.forEach((house) => {
    const key = `${house.bedroomCount}室${house.livingRoomCount}厅`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
});

const candidateRows = computed(() =>
  houses.value
    .map((house) => {
      const route = routes.value.get(house.id);
      return {
        house,
        totalCost: getMonthlyTotalCost(house),
        route,
        score: getMonthlyTotalCost(house) + (route ? (route.duration / 60) * 80 : 1800)
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
);

const commuteScatterRows = computed(() =>
  houses.value
    .map((house) => {
      const route = routes.value.get(house.id);
      if (!route) return null;

      return {
        name: house.name,
        value: [Math.round(route.duration / 60), house.rentPrice, getMonthlyTotalCost(house)],
        symbolSize: Math.max(12, Math.min(30, house.bedroomCount * 7 + 8))
      };
    })
    .filter((item): item is { name: string; value: number[]; symbolSize: number } => Boolean(item))
);

const summaryCards = computed(() => [
  {
    label: '房源总数',
    value: houses.value.length.toString(),
    helper: `${mappedCount.value} 套已有坐标`
  },
  {
    label: '平均租金',
    value: formatCurrency(averageRent.value),
    helper: `含费用均值 ${formatCurrency(averageTotalCost.value)}`
  },
  {
    label: '平均通勤',
    value: averageCommute.value === undefined ? '-' : `${Math.round(averageCommute.value)} 分钟`,
    helper: bestCommute.value ? `最快 ${bestCommute.value.house.name}` : '等待路线数据'
  }
]);

function hasCoordinate(house: House) {
  return house.latitude !== undefined && house.longitude !== undefined;
}

function average(values: Array<number | undefined>) {
  const validValues = values.filter((value): value is number => value !== undefined && Number.isFinite(value));
  if (!validValues.length) return undefined;

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function getMonthlyTotalCost(house: House) {
  return house.rentPrice + (house.propertyFee ?? 0) + (house.otherFee ?? 0);
}

function formatMinutes(seconds?: number) {
  if (seconds === undefined) return '-';

  return `${Math.round(seconds / 60)} 分钟`;
}

function initChart(element: HTMLDivElement | null) {
  if (!element) return undefined;

  return echarts.init(element, undefined, { renderer: 'canvas' });
}

function getThemeColor(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderCharts() {
  const [statusChart, rentChart, sourceChart, commuteChart] = charts.value;
  const primaryColor = getThemeColor('--el-color-primary');
  const successColor = getThemeColor('--el-color-success');
  const warningColor = getThemeColor('--el-color-warning');
  const dangerColor = getThemeColor('--el-color-danger');
  const infoColor = getThemeColor('--el-color-info');
  const textColor = getThemeColor('--el-text-color-primary');
  const mutedColor = getThemeColor('--el-text-color-secondary');
  const splitLineColor = getThemeColor('--el-border-color-lighter');
  const emptyColor = getThemeColor('--el-color-info-light-8');
  const statusData = statusRows.value;
  const sourceData = sourceRows.value.filter((item) => item.value > 0);
  const hasStatusData = statusData.some((item) => item.value > 0);
  const hasSourceData = sourceData.length > 0;

  statusChart?.setOption({
    color: hasStatusData ? [infoColor, primaryColor, warningColor, dangerColor, successColor] : [emptyColor],
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['50%', '76%'],
        center: ['50%', '52%'],
        label: { show: hasStatusData, color: textColor, formatter: '{b}\n{c}套' },
        silent: !hasStatusData,
        data: hasStatusData ? statusData : [{ name: '暂无数据', value: 1 }]
      }
    ]
  } satisfies EChartsOption);

  rentChart?.setOption({
    color: [primaryColor],
    grid: { left: 34, right: 14, top: 18, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: rentBuckets.value.map((item) => item.name), axisLabel: { color: mutedColor } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: mutedColor }, splitLine: { lineStyle: { color: splitLineColor } } },
    series: [
      {
        type: 'bar',
        barWidth: 24,
        itemStyle: { borderRadius: [5, 5, 0, 0] },
        data: rentBuckets.value.map((item) => item.value)
      }
    ]
  } satisfies EChartsOption);

  sourceChart?.setOption({
    color: hasSourceData ? [primaryColor, successColor, warningColor, dangerColor, infoColor] : [emptyColor],
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '72%',
        center: ['50%', '52%'],
        label: { show: hasSourceData, color: textColor, formatter: '{b} {c}' },
        silent: !hasSourceData,
        data: hasSourceData ? sourceData : [{ name: '暂无数据', value: 1 }]
      }
    ]
  } satisfies EChartsOption);

  commuteChart?.setOption({
    color: [dangerColor],
    grid: { left: 46, right: 18, top: 20, bottom: 34 },
    tooltip: {
      formatter: (params: unknown) => {
        const item = params as { name: string; value: number[] };
        return `${item.name}<br/>通勤 ${item.value[0]} 分钟<br/>租金 ${formatCurrency(item.value[1])}<br/>月成本 ${formatCurrency(item.value[2])}`;
      }
    },
    xAxis: { type: 'value', name: '分钟', axisLabel: { color: mutedColor }, splitLine: { lineStyle: { color: splitLineColor } } },
    yAxis: {
      type: 'value',
      name: '租金',
      axisLabel: { color: mutedColor, formatter: (value: number) => `${Math.round(value / 1000)}k` },
      splitLine: { lineStyle: { color: splitLineColor } }
    },
    series: [{ type: 'scatter', data: commuteScatterRows.value }]
  } satisfies EChartsOption);
}

function resizeCharts() {
  charts.value.forEach((chart) => chart.resize());
}

async function loadData() {
  loading.value = true;
  try {
    const [allHouses, allLocations] = await Promise.all([
      fetchHouses({ status: '', sourceChannel: '' }),
      fetchLocations({ category: '' })
    ]);

    rawHouses.value = allHouses;
    rawLocations.value = allLocations;

    const focus = allLocations.find(
      (loc) => loc.isFocus && loc.latitude !== undefined && loc.longitude !== undefined
    );

    if (focus) {
      const destination = `${focus.longitude},${focus.latitude}`;
      const targets = allHouses.filter((house) => house.latitude !== undefined && house.longitude !== undefined);
      const results = new Map<string, DrivingRouteResult>();

      await Promise.all(
        targets.map(async (house) => {
          const origin = `${house.longitude},${house.latitude}`;
          const result = await getDrivingRoute(origin, destination);
          if (result) {
            results.set(house.id, result);
          }
        })
      );

      rawRoutes.value = results;
    }
  } catch {
    // Data load errors are silently handled - charts will show "no data" state
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadData();
  await nextTick();
  charts.value = [initChart(statusChartRef.value), initChart(rentChartRef.value), initChart(sourceChartRef.value), initChart(commuteChartRef.value)].filter(
    (chart): chart is ECharts => Boolean(chart)
  );
  renderCharts();

  resizeObserver = new ResizeObserver(resizeCharts);
  charts.value.forEach((chart) => {
    const element = chart.getDom();
    if (element) resizeObserver?.observe(element);
  });
});

watch([statusRows, rentBuckets, sourceRows, commuteScatterRows], () => {
  renderCharts();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  charts.value.forEach((chart) => chart.dispose());
});
</script>

<template>
  <el-container class="stats-page" direction="vertical">
    <el-header class="stats-header">
      <div class="stats-title-row">
        <el-tooltip content="返回地图" placement="bottom">
          <el-button class="stats-back-button" :icon="ArrowLeft" text aria-label="返回地图" @click="router.push('/')" />
        </el-tooltip>
        <h1>数据统计</h1>
      </div>
    </el-header>

    <el-main class="stats-main">
      <el-scrollbar class="stats-scrollbar">
        <section v-loading="loading" class="stats-content">
          <div class="stats-summary-grid">
            <article v-for="card in summaryCards" :key="card.label" class="stats-summary-card">
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <small>{{ card.helper }}</small>
            </article>
          </div>

          <div class="stats-chart-grid">
            <article class="stats-panel">
              <header>
                <h2>跟进状态</h2>
                <span>{{ houses.length }} 套</span>
              </header>
              <div ref="statusChartRef" class="stats-chart"></div>
            </article>

            <article class="stats-panel">
              <header>
                <h2>租金区间</h2>
                <span>月租</span>
              </header>
              <div ref="rentChartRef" class="stats-chart stats-chart--compact"></div>
            </article>

            <article class="stats-panel">
              <header>
                <h2>渠道来源</h2>
                <span>{{ sourceRows.filter((item) => item.value > 0).length }} 类</span>
              </header>
              <div ref="sourceChartRef" class="stats-chart"></div>
            </article>

            <article class="stats-panel">
              <header>
                <h2>通勤与租金</h2>
                <span>{{ commuteScatterRows.length }} 套</span>
              </header>
              <div ref="commuteChartRef" class="stats-chart stats-chart--compact"></div>
            </article>
          </div>

          <article class="stats-panel stats-panel--list">
            <header>
              <h2>优先候选</h2>
              <span>按租金和通勤估算</span>
            </header>
            <div class="stats-candidate-list">
              <button
                v-for="item in candidateRows"
                :key="item.house.id"
                class="stats-candidate-row"
                type="button"
                @click="router.push('/houses')"
              >
                <span>
                  <strong>{{ item.house.name }}</strong>
                  <small>{{ item.house.bedroomCount }}室{{ item.house.livingRoomCount }}厅 · {{ statusLabels[item.house.status] }}</small>
                </span>
                <span>
                  <b>{{ formatCurrency(item.totalCost) }}</b>
                  <small>{{ formatMinutes(item.route?.duration) }}</small>
                </span>
              </button>
              <el-empty v-if="!candidateRows.length" description="暂无房源数据" />
            </div>
          </article>

          <article class="stats-panel stats-panel--list">
            <header>
              <h2>户型分布</h2>
              <span>Top 5</span>
            </header>
            <div class="stats-rank-list">
              <div v-for="item in roomTypeRows" :key="item.name" class="stats-rank-row">
                <span>{{ item.name }}</span>
                <div>
                  <i :style="{ width: `${Math.max(12, (item.value / Math.max(...roomTypeRows.map((row) => row.value), 1)) * 100)}%` }"></i>
                </div>
                <b>{{ item.value }}</b>
              </div>
              <el-empty v-if="!roomTypeRows.length" description="暂无户型数据" />
            </div>
          </article>
        </section>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.stats-page {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  background: var(--app-bg-page);
  color: var(--app-text-primary);
}

.stats-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: auto;
  padding: 12px 24px;
  border-bottom: 1px solid var(--app-border-light);
  background: var(--el-bg-color);
}

.stats-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-back-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-text-primary);
  font-size: 16px;
}

.stats-back-button:hover,
.stats-back-button:focus {
  background: transparent;
  color: var(--el-color-primary);
}

.stats-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.stats-main {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.stats-scrollbar {
  height: 100%;
}

.stats-content {
  width: min(100%, 980px);
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 12px;
}

.stats-back-button :deep(.el-icon) {
  font-size: 16px;
}

.stats-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stats-summary-card,
.stats-panel {
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.stats-summary-card {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px;
}

.stats-summary-card span,
.stats-summary-card small,
.stats-panel header span,
.stats-candidate-row small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.stats-summary-card strong {
  min-width: 0;
  overflow: hidden;
  color: var(--app-text-primary);
  font-size: 20px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stats-panel {
  display: grid;
  min-width: 0;
  overflow: hidden;
}

.stats-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  border-bottom: 1px solid var(--app-border-lighter);
  padding: 10px 12px;
}

.stats-panel h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--app-text-primary);
  font-size: 14px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-chart {
  width: 100%;
  height: 230px;
  min-width: 0;
}

.stats-chart--compact {
  height: 210px;
}

.stats-panel--list {
  gap: 0;
}

.stats-candidate-list,
.stats-rank-list {
  display: grid;
  gap: 8px;
  padding: 10px;
}

.stats-candidate-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  border: 1px solid var(--app-border-lighter);
  border-radius: 8px;
  background: var(--app-bg-soft);
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 10px;
  text-align: left;
}

.stats-candidate-row:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.stats-candidate-row > span {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.stats-candidate-row > span:last-child {
  justify-items: end;
}

.stats-candidate-row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--app-text-primary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-candidate-row b {
  color: var(--el-color-danger);
  font-size: 14px;
  white-space: nowrap;
}

.stats-rank-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 22px;
  gap: 8px;
  align-items: center;
  color: var(--app-text-regular);
  font-size: 13px;
}

.stats-rank-row > span,
.stats-rank-row > b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-rank-row > div {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-fill-light);
}

.stats-rank-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--el-color-success);
}

@media (max-width: 620px) {
  .stats-summary-grid,
  .stats-chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .stats-header {
    padding: 10px 16px;
  }

  .stats-content {
    padding: 14px;
  }
}
</style>
