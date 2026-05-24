<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { fetchHouses } from '../../api/house/house-api';
import type { House, ViewingSchedule } from '../../model/house/house';

interface CalendarScheduleItem {
  house: House;
  schedule: ViewingSchedule;
  date: Date;
}

const router = useRouter();
const selectedDate = ref(new Date());
const houses = ref<House[]>([]);
const loading = ref(true);

const schedulesByDay = computed(() => {
  const groups = new Map<string, CalendarScheduleItem[]>();

  for (const house of houses.value) {
    for (const schedule of house.viewingSchedules ?? []) {
      const date = new Date(schedule.viewingAt);
      if (Number.isNaN(date.getTime())) continue;

      const key = formatDateKey(date);
      const items = groups.get(key) ?? [];
      items.push({ house, schedule, date });
      groups.set(key, items);
    }
  }

  for (const items of groups.values()) {
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return groups;
});

async function loadHouses() {
  loading.value = true;
  try {
    houses.value = await fetchHouses({ status: '', sourceChannel: '' });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载日程失败');
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

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

onMounted(loadHouses);
</script>

<template>
  <el-container class="schedule-calendar-page" direction="vertical">
    <el-header class="schedule-calendar-header">
      <div class="schedule-calendar-title-row">
        <el-tooltip content="返回地图" placement="bottom">
          <el-button
            class="schedule-calendar-back-button"
            :icon="ArrowLeft"
            text
            aria-label="返回地图"
            @click="router.push('/')"
          />
        </el-tooltip>
        <h1>日程</h1>
      </div>
    </el-header>

    <el-main v-loading="loading" class="schedule-calendar-main">
      <section class="schedule-calendar-content">
        <el-calendar v-model="selectedDate" class="viewing-calendar">
          <template #date-cell="{ data }">
            <div class="viewing-calendar-cell" :class="{ 'is-selected': data.isSelected }">
              <div class="viewing-calendar-day">{{ Number(data.day.slice(-2)) }}</div>
              <div class="viewing-calendar-events">
                <div
                  v-for="item in schedulesByDay.get(data.day) ?? []"
                  :key="`${item.house.id}-${item.schedule.id}`"
                  class="viewing-calendar-event"
                >
                  <time>{{ formatTime(item.date) }}</time>
                  <span>{{ item.house.name }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-calendar>
      </section>
    </el-main>
  </el-container>
</template>
