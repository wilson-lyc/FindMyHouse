<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import { houseSourceChannelLabels, houseSourceChannels, houseStatuses, type House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import { formatCurrency } from '../../lib/format';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';

const context = inject<MainLayoutContext>(mainLayoutContextKey);

if (!context) {
  throw new Error('StatsView must be used inside MainLayout.');
}

const statusChartRef = ref<HTMLDivElement | null>(null);
const rentChartRef = ref<HTMLDivElement | null>(null);
const sourceChartRef = ref<HTMLDivElement | null>(null);
const commuteChartRef = ref<HTMLDivElement | null>(null);
const charts = shallowRef<ECharts[]>([]);
let resizeObserver: ResizeObserver | undefined;

const houses = computed(() => context.houses.value);
const routes = computed(() => context.drivingRoutes.value);

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

onMounted(async () => {
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
  <section class="stats-page" v-loading="context.loading.value">
    <header class="stats-header">
      <div>
        <h1>数据统计</h1>
        <p>从房源状态、价格、渠道和通勤维度快速筛选优先级。</p>
      </div>
    </header>

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
        <button v-for="item in candidateRows" :key="item.house.id" class="stats-candidate-row" type="button" @click="context.selectHouse(item.house)">
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
</template>
