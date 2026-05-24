<script setup lang="ts">
import { reactive, watch } from 'vue';
import { Delete as DeleteIcon, Plus } from '@element-plus/icons-vue';
import type { House, ViewingSchedule } from '../../model/house/house';
import { houseToForm } from '../../lib/house/house-form';

const props = defineProps<{
  modelValue: boolean;
  house: House | null;
  saving: boolean;
  addScheduleOnOpen?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  submit: [schedules: ViewingSchedule[]];
}>();

const schedules = reactive<ViewingSchedule[]>([]);

watch(
  () => [props.modelValue, props.house, props.addScheduleOnOpen] as const,
  ([visible, house, addScheduleOnOpen]) => {
    if (!visible || !house) return;

    schedules.splice(0, schedules.length, ...(houseToForm(house).viewingSchedules ?? []));
    if (addScheduleOnOpen) {
      addViewingSchedule();
    }
  },
  { immediate: true }
);

function createScheduleId() {
  return globalThis.crypto?.randomUUID?.() ?? `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDateTimeForPicker(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function addViewingSchedule() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  schedules.push({
    id: createScheduleId(),
    viewingAt: formatDateTimeForPicker(now),
    note: ''
  });
}

function deleteViewingSchedule(index: number) {
  schedules.splice(index, 1);
}

function submitSchedules() {
  emit(
    'submit',
    schedules.map((schedule) => ({ ...schedule }))
  );
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="house ? `预约看房 - ${house.name}` : '预约看房'"
    width="640px"
    class="house-schedule-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="viewing-schedules-wrap">
      <div class="viewing-schedules-header">
        <span class="viewing-schedules-count">共 {{ schedules.length }} 条安排</span>
        <el-button :icon="Plus" type="primary" plain size="small" @click="addViewingSchedule">添加日程</el-button>
      </div>
      <el-table
        :data="schedules"
        stripe
        size="small"
        max-height="360"
        class="viewing-schedules-table"
        empty-text="暂无看房安排"
      >
        <el-table-column label="时间" min-width="210">
          <template #default="{ row }">
            <el-date-picker
              v-model="row.viewingAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              placeholder="选择看房时间"
            />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.note" placeholder="中介、门牌、同行人等" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="82" fixed="right">
          <template #default="{ $index }">
            <el-button :icon="DeleteIcon" link type="danger" size="small" @click="deleteViewingSchedule($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submitSchedules">保存日程</el-button>
    </template>
  </el-dialog>
</template>

