<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Calendar, Delete as DeleteIcon, EditPen, Guide, House as HouseIcon, Plus } from '@element-plus/icons-vue';
import { getCommuteDistance, getCommuteRoute } from '../../api/map/map-api';
import {
  createScheduleRoutePlan,
  scheduleRouteDistanceKey,
  type ScheduleRouteDistanceLookup,
  type ScheduleRouteItem,
  type ScheduleRoutePlan
} from '../../lib/schedule/route-planner';
import type { House, ViewingSchedule } from '../../model/house/house';
import type { Schedule } from '../../model/schedule/schedule';
import type { Location } from '../../model/location/location';
import type { CommuteDistanceResult, CommuteMode } from '../../model/map/geocode';

const props = withDefaults(
  defineProps<{
    houses: House[];
    schedules: Schedule[];
    loading?: boolean;
    title?: string;
    emptyDescription?: string;
    dateKey?: string;
    showCalendarButton?: boolean;
    compact?: boolean;
    hideHeader?: boolean;
    hideGroupLabels?: boolean;
    focusLocation?: Location | null;
    routes?: Map<string, CommuteDistanceResult>;
    scheduleRoutePlan?: ScheduleRoutePlan | null;
    commuteMode?: CommuteMode;
    onSelectHouse?: (house: House) => void;
    onShowRoute?: (house: House) => void;
    onEditHouse?: (house: House) => void;
    onEditSchedule?: (schedule: Schedule) => void;
    onAddSchedule?: () => void;
    onDeleteSchedule?: (scheduleId: string) => void;
    onShowRoutePlan?: (plan: ScheduleRoutePlan) => void;
  }>(),
  {
    loading: false,
    title: '看房日程',
    emptyDescription: '暂无看房安排',
    dateKey: undefined,
    showCalendarButton: false,
    compact: false,
    hideHeader: false,
    hideGroupLabels: false,
    focusLocation: null,
    routes: undefined,
    scheduleRoutePlan: undefined,
    commuteMode: 'driving',
    onSelectHouse: undefined,
    onShowRoute: undefined,
    onEditHouse: undefined,
    onEditSchedule: undefined,
    onAddSchedule: undefined,
    onDeleteSchedule: undefined,
    onShowRoutePlan: undefined
  }
);

const emit = defineEmits<{
  calendar: [];
}>();

const planningDateKey = ref<string | null>(null);
const activeRoutePlan = ref<ScheduleRoutePlan | null>(null);
const showAllSchedules = ref(false);

const houseMap = computed(() => new Map(props.houses.map((h) => [h.id, h])));

watch(
  () => props.scheduleRoutePlan,
  (plan) => {
    if (plan !== undefined) {
      activeRoutePlan.value = plan;
    }
  },
  { immediate: true }
);

const scheduleItems = computed<ScheduleRouteItem[]>(() => {
  const todayKey = formatDateKey(new Date());

  return props.schedules
    .map((schedule) => {
      const date = new Date(schedule.viewingAt);
      const house = houseMap.value.get(schedule.houseId);
      return {
        house: house ?? ({} as House),
        schedule: {
          id: schedule.id,
          viewingAt: schedule.viewingAt,
          note: schedule.note
        } as ViewingSchedule,
        date,
        dateKey: formatDateKey(date)
      };
    })
    .filter((item) => !Number.isNaN(item.date.getTime()) && (!props.dateKey || item.dateKey === props.dateKey))
    .filter((item) => showAllSchedules.value || item.dateKey >= todayKey)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
});

const groupedSchedules = computed(() => {
  const groups: Array<{ key: string; label: string; items: ScheduleRouteItem[] }> = [];

  for (const item of scheduleItems.value) {
    const current = groups[groups.length - 1];
    if (current?.key === item.dateKey) {
      current.items.push(item);
      continue;
    }

    groups.push({
      key: item.dateKey,
      label: formatDateLabel(item.date),
      items: [item]
    });
  }

  return groups;
});

const hasActions = computed(
  () => Boolean(props.onSelectHouse || props.onEditSchedule || props.onDeleteSchedule)
);

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function formatDistance(meters: number) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} 公里`;
  }

  return `${Math.round(meters)} 米`;
}

function formatDuration(seconds: number | undefined) {
  if (seconds === undefined) return undefined;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} 小时${rest > 0 ? ` ${rest} 分钟` : ''}`;
}

function coordinatesToParam(value: { longitude?: number; latitude?: number }) {
  if (value.longitude === undefined || value.latitude === undefined) return undefined;
  return `${value.longitude},${value.latitude}`;
}

async function loadDistance(
  fromId: string,
  toId: string,
  from: { longitude?: number; latitude?: number },
  to: { longitude?: number; latitude?: number },
  lookup: ScheduleRouteDistanceLookup
) {
  const origin = coordinatesToParam(from);
  const destination = coordinatesToParam(to);
  if (!origin || !destination) return;

  try {
    const result = await getCommuteDistance(origin, destination, props.commuteMode);
    lookup.set(scheduleRouteDistanceKey(fromId, toId), {
      distance: result.distance,
      duration: result.duration
    });
  } catch (error) {
    console.warn('Failed to load schedule route distance:', error);
  }
}

async function loadPlanLegRoutes(plan: ScheduleRoutePlan): Promise<ScheduleRoutePlan> {
  const legs = await Promise.all(
    plan.items.map(async (item, index) => {
      const from = index === 0 ? plan.origin : plan.items[index - 1].house;
      const origin = coordinatesToParam(from);
      const destination = coordinatesToParam(item.house);
      const fallback = plan.legs[index];
      if (!origin || !destination) return fallback;

      try {
        const route = await getCommuteRoute(origin, destination, props.commuteMode);
        return {
          ...fallback,
          distance: route.distance,
          duration: route.duration,
          polyline: route.polyline,
          estimated: false,
          timeConstrained: fallback.timeConstrained,
          availableSeconds: fallback.availableSeconds
        };
      } catch (error) {
        console.warn('Failed to load schedule route polyline:', error);
        return fallback;
      }
    })
  );

  const totalDuration = legs.reduce<number | undefined>((total, leg) => {
    if (total === undefined || leg.duration === undefined) return undefined;
    return total + leg.duration;
  }, 0);

  return {
    ...plan,
    legs,
    totalDistance: legs.reduce((total, leg) => total + leg.distance, 0),
    totalDuration,
    estimatedLegCount: legs.filter((leg) => leg.estimated).length
  };
}

async function planGroupRoute(group: { key: string; items: ScheduleRouteItem[] }) {
  if (!props.focusLocation?.id || props.focusLocation.longitude === undefined || props.focusLocation.latitude === undefined) {
    ElMessage.warning('请先设置带坐标的焦点地点');
    return;
  }

  const routableItems = group.items.filter((item) => item.house.longitude !== undefined && item.house.latitude !== undefined);
  if (routableItems.length === 0) {
    ElMessage.warning('当天房源缺少坐标，无法规划路线');
    return;
  }

  planningDateKey.value = group.key;
  const lookup: ScheduleRouteDistanceLookup = new Map();

  try {
    const timeOrderedItems = [...routableItems].sort((a, b) => a.date.getTime() - b.date.getTime());
    await Promise.all([
      ...timeOrderedItems.map((item, index) => {
        if (index === 0) {
          return loadDistance(props.focusLocation!.id, item.house.id, props.focusLocation!, item.house, lookup);
        }

        const previous = timeOrderedItems[index - 1];
        return loadDistance(previous.house.id, item.house.id, previous.house, item.house, lookup);
      })
    ]);

    const plan = createScheduleRoutePlan(group.key, routableItems, props.focusLocation, lookup, props.routes);
    if (!plan) {
      ElMessage.warning('当天房源缺少坐标，无法规划路线');
      return;
    }

    const routePlan = await loadPlanLegRoutes(plan);
    activeRoutePlan.value = routePlan;
    props.onShowRoutePlan?.(routePlan);
  } finally {
    planningDateKey.value = null;
  }
}

function findHouseBySchedule(scheduleId: string): House | undefined {
  const item = scheduleItems.value.find((si) => si.schedule.id === scheduleId);
  return item?.house;
}

function selectHouse(house: House) {
  props.onSelectHouse?.(house);
}

function editSchedule(schedule: Schedule) {
  props.onEditSchedule?.(schedule);
}

function deleteSchedule(scheduleId: string) {
  props.onDeleteSchedule?.(scheduleId);
}

function isTimeRisk(plan: ScheduleRoutePlan, index: number) {
  const leg = plan.legs[index];
  return Boolean(leg?.timeConstrained && leg.duration !== undefined && leg.availableSeconds !== undefined && leg.duration > leg.availableSeconds);
}

function timeRiskCount(plan: ScheduleRoutePlan) {
  return plan.legs.filter((leg) => leg.timeConstrained && leg.duration !== undefined && leg.availableSeconds !== undefined && leg.duration > leg.availableSeconds).length;
}
</script>

<template>
  <div class="schedule-pane" :class="{ 'schedule-pane-compact': compact, 'schedule-pane-no-header': hideHeader }">
    <header v-if="!hideHeader" class="panel-header">
      <h2>{{ title }}</h2>
      <div class="panel-header-actions">
        <div class="schedule-toggle-all">
          <el-switch v-model="showAllSchedules" size="small" />
          <span>全部</span>
        </div>
        <el-button v-if="onAddSchedule" text :icon="Plus" aria-label="添加日程" title="添加日程" @click="onAddSchedule" />
        <el-button v-if="showCalendarButton" text :icon="Calendar" aria-label="日历" title="日历" @click="emit('calendar')" />
      </div>
    </header>

    <el-scrollbar v-loading="loading" class="schedule-list-scrollbar">
      <el-empty v-if="!loading && !scheduleItems.length" :description="emptyDescription" />
      <div v-else class="schedule-group-list">
        <section v-for="group in groupedSchedules" :key="group.key" class="schedule-group">
          <div v-if="!hideGroupLabels || focusLocation" class="schedule-group-header">
            <h3 v-if="!hideGroupLabels">{{ group.label }}</h3>
            <el-button
              v-if="focusLocation"
              :icon="Guide"
              link
              type="primary"
              :loading="planningDateKey === group.key"
              @click="planGroupRoute(group)"
            >
              规划路线
            </el-button>
          </div>
          <div v-if="activeRoutePlan?.dateKey === group.key" class="schedule-route-plan">
            <div class="schedule-route-plan-summary">
              <strong>{{ focusLocation?.name }}出发</strong>
              <span>
                按预约时间 · {{ activeRoutePlan.items.length }} 套 · {{ formatDistance(activeRoutePlan.totalDistance) }}
                <template v-if="formatDuration(activeRoutePlan.totalDuration)">
                  · {{ formatDuration(activeRoutePlan.totalDuration) }}
                </template>
              </span>
            </div>
            <ol class="schedule-route-stop-list">
              <li v-for="(item, index) in activeRoutePlan.items" :key="`${activeRoutePlan.dateKey}-${item.house.id}`">
                <span>{{ index + 1 }}</span>
                <div>
                  <strong>{{ item.house.name }}</strong>
                  <small>
                    {{ formatTime(item.date) }} · {{ activeRoutePlan.legs[index]?.fromName }} 到这里 {{ formatDistance(activeRoutePlan.legs[index]?.distance ?? 0) }}
                    <template v-if="formatDuration(activeRoutePlan.legs[index]?.duration)">
                      · {{ formatDuration(activeRoutePlan.legs[index]?.duration) }}
                    </template>
                    <template v-if="isTimeRisk(activeRoutePlan, index)"> · 时间不足</template>
                  </small>
                </div>
              </li>
            </ol>
            <p v-if="timeRiskCount(activeRoutePlan) > 0">
              有 {{ timeRiskCount(activeRoutePlan) }} 段行程可能赶不上预约时间，请调整看房间隔。
            </p>
            <p v-if="activeRoutePlan.estimatedLegCount > 0">
              有 {{ activeRoutePlan.estimatedLegCount }} 段接口未返回距离，已用直线距离兜底。
            </p>
          </div>
          <article v-for="item in group.items" :key="item.schedule.id" class="schedule-card">
            <div class="schedule-card-main" :class="{ 'is-clickable': onSelectHouse }" @click="selectHouse(item.house)">
              <time>{{ formatTime(item.date) }}</time>
              <div>
                <strong>{{ item.house.name }}</strong>
                <p>{{ item.schedule.note || item.house.address }}</p>
              </div>
            </div>
            <div v-if="hasActions" class="schedule-card-actions">
              <el-button v-if="onSelectHouse" :icon="HouseIcon" link type="primary" @click="selectHouse(item.house)">
                房源
              </el-button>
              <el-button v-if="onEditSchedule" :icon="EditPen" link type="primary" @click="editSchedule(props.schedules.find(s => s.id === item.schedule.id)!)">
                编辑
              </el-button>
              <el-popconfirm
                v-if="onDeleteSchedule"
                title="确定要删除此日程吗？"
                confirm-button-text="删除"
                width="200"
                @confirm="deleteSchedule(item.schedule.id)"
              >
                <template #reference>
                  <el-button :icon="DeleteIcon" link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </article>
        </section>
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped>
.schedule-toggle-all {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
</style>
