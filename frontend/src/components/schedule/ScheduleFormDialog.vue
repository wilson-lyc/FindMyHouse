<script setup lang="ts">
import { reactive, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import type { House } from '../../model/house/house';
import type { Schedule, ScheduleForm } from '../../model/schedule/schedule';

const props = defineProps<{
  modelValue: boolean;
  editingSchedule?: Schedule | null;
  prefillHouseId?: string | null;
  houses: House[];
  saving: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  submit: [form: ScheduleForm];
}>();

const form = reactive<ScheduleForm>({
  houseId: '',
  viewingAt: '',
  note: ''
});

watch(
  () => [props.modelValue, props.editingSchedule, props.prefillHouseId] as const,
  ([visible, editingSchedule, prefillHouseId]) => {
    if (!visible) return;

    if (editingSchedule) {
      form.houseId = editingSchedule.houseId;
      form.viewingAt = normalizeViewingAtForPicker(editingSchedule.viewingAt);
      form.note = editingSchedule.note ?? '';
    } else {
      form.houseId = prefillHouseId ?? '';
      form.viewingAt = '';
      form.note = '';
    }
  },
  { immediate: true }
);

function normalizeViewingAtForPicker(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function normalizeViewingAtForApi(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function submitForm() {
  if (!form.houseId || !form.viewingAt) return;

  emit('submit', {
    houseId: form.houseId,
    viewingAt: normalizeViewingAtForApi(form.viewingAt),
    note: form.note?.trim() || undefined
  });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="editingSchedule ? '编辑日程' : '添加日程'"
    width="520px"
    class="schedule-form-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-width="80px" class="schedule-form">
      <el-form-item label="房源" required>
        <el-select v-model="form.houseId" filterable style="width: 100%">
          <el-option
            v-for="house in houses"
            :key="house.id"
            :label="house.name"
            :value="house.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="时间" required>
        <el-date-picker
          v-model="form.viewingAt"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          format="YYYY-MM-DD HH:mm"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="2"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!form.houseId || !form.viewingAt" @click="submitForm">
        {{ editingSchedule ? '保存' : '添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.schedule-form {
  padding: 8px 0;
}
</style>
