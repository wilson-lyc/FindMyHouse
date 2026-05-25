<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import ScheduleListPanel from '../../components/schedule/ScheduleListPanel.vue';
import { useScheduleStore } from '../../stores/scheduleStore';
import { useHouses } from '../../composables/house/useHouses';
import type { Schedule } from '../../model/schedule/schedule';

interface CalendarScheduleItem {
  schedule: Schedule;
  date: Date;
}

const router = useRouter();
const scheduleStore = useScheduleStore();
const { houses, loadHouses } = useHouses();
const selectedDate = ref(new Date());
const scheduleDialogVisible = ref(false);
const selectedDialogDateKey = ref(formatDateKey(new Date()));
const loading = ref(true);

const schedulesByDay = computed(() => {
  const groups = new Map<string, CalendarScheduleItem[]>();
  for (const schedule of scheduleStore.schedules) {
    const date = new Date(schedule.viewingAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = formatDateKey(date);
    const items = groups.get(key) ?? [];
    items.push({ schedule, date });
    groups.set(key, items);
  }

  for (const items of groups.values()) {
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return groups;
});

const selectedDialogTitle = computed(() => `${formatDateLabel(parseDateKey(selectedDialogDateKey.value))} 日程`);

async function loadData() {
  loading.value = true;
  try {
    await Promise.all([scheduleStore.loadSchedules(), loadHouses()]);
  } finally {
    loading.value = false;
  }
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year = '0', month = '1', day = '1'] = dateKey.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function openScheduleDialog(day: string) {
  selectedDate.value = parseDateKey(day);
  selectedDialogDateKey.value = day;
  scheduleDialogVisible.value = true;
}

onMounted(loadData);
</script>

<template>
  <el-container class="schedule-calendar-page" direction="vertical">
    <el-header class="schedule-calendar-header">
      <div class="schedule-calendar-title-row">
        <el-tooltip content="返回地图" placement="bottom">
          <el-button class="schedule-calendar-back-button" :icon="ArrowLeft" text aria-label="返回地图" @click="router.push('/')" />
        </el-tooltip>
        <h1>日程</h1>
      </div>
    </el-header>
    <el-main v-loading="loading" class="schedule-calendar-main">
      <section class="schedule-calendar-content">
        <el-calendar v-model="selectedDate" class="viewing-calendar">
          <template #date-cell="{ data }">
            <div class="viewing-calendar-cell" :class="{ 'is-selected': data.isSelected }" @click="openScheduleDialog(data.day)">
              <div class="viewing-calendar-day">{{ Number(data.day.slice(-2)) }}</div>
              <div class="viewing-calendar-events">
                <div v-for="item in schedulesByDay.get(data.day) ?? []" :key="item.schedule.id" class="viewing-calendar-event">
                  <time>{{ formatTime(item.date) }}</time>
                  <span>{{ item.schedule.houseName || '' }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-calendar>
      </section>
    </el-main>
    <el-dialog v-model="scheduleDialogVisible" :title="selectedDialogTitle" width="520px" class="schedule-day-dialog">
      <ScheduleListPanel
        :houses="houses"
        :schedules="scheduleStore.schedules" :loading="loading" :title="selectedDialogTitle" :date-key="selectedDialogDateKey"
        empty-description="当天暂无看房安排" compact hide-header hide-group-labels
      />
    </el-dialog>
  </el-container>
</template>
