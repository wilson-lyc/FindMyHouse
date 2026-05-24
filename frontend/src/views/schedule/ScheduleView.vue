<script setup lang="ts">
import { computed, inject } from 'vue';
import { useRouter } from 'vue-router';
import { Calendar, Edit, House as HouseIcon, Van } from '@element-plus/icons-vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';
import type { House, ViewingSchedule } from '../../model/house/house';
import { useHouseDialogStore } from '../../stores/houseDialogStore';

interface ScheduleItem {
  house: House;
  schedule: ViewingSchedule;
  date: Date;
  dateKey: string;
}

const context = inject<MainLayoutContext>(mainLayoutContextKey);

if (!context) {
  throw new Error('ScheduleView must be used inside MainLayout.');
}

const layoutContext = context;
const router = useRouter();
const houseDialogStore = useHouseDialogStore();

const scheduleItems = computed<ScheduleItem[]>(() =>
  layoutContext.houses.value
    .flatMap((house) =>
      (house.viewingSchedules ?? []).map((schedule) => {
        const date = new Date(schedule.viewingAt);
        return {
          house,
          schedule,
          date,
          dateKey: formatDateKey(date)
        };
      })
    )
    .filter((item) => !Number.isNaN(item.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
);

const groupedSchedules = computed(() => {
  const groups: Array<{ key: string; label: string; items: ScheduleItem[] }> = [];

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
</script>

<template>
  <div class="schedule-pane">
    <header class="schedule-pane-header">
      <div>
        <h2>看房日程</h2>
        <p>共 {{ scheduleItems.length }} 条安排</p>
      </div>
      <el-button :icon="Calendar" @click="router.push('/schedule-calendar')">日历</el-button>
    </header>

    <el-scrollbar v-loading="layoutContext.loading.value" class="schedule-list-scrollbar">
      <el-empty v-if="!layoutContext.loading.value && !scheduleItems.length" description="暂无看房安排" />
      <div v-else class="schedule-group-list">
        <section v-for="group in groupedSchedules" :key="group.key" class="schedule-group">
          <h3>{{ group.label }}</h3>
          <article v-for="item in group.items" :key="`${item.house.id}-${item.schedule.id}`" class="schedule-card">
            <div class="schedule-card-main" @click="layoutContext.selectHouse(item.house)">
              <time>{{ formatTime(item.date) }}</time>
              <div>
                <strong>{{ item.house.name }}</strong>
                <p>{{ item.schedule.note || item.house.address }}</p>
              </div>
            </div>
            <div class="schedule-card-actions">
              <el-button :icon="HouseIcon" link type="primary" @click="layoutContext.selectHouse(item.house)">房源</el-button>
              <el-button
                :icon="Van"
                link
                type="primary"
                :disabled="item.house.latitude === undefined || item.house.longitude === undefined"
                @click="layoutContext.showRoute(item.house)"
              >
                路线
              </el-button>
              <el-button :icon="Edit" link type="primary" @click="houseDialogStore.openEdit(item.house)">详情</el-button>
            </div>
          </article>
        </section>
      </div>
    </el-scrollbar>
  </div>
</template>
