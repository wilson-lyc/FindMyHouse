<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CustomFeeItem } from '../../model/house/house';

const props = defineProps<{
  modelValue: boolean;
  item: CustomFeeItem | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  save: [item: CustomFeeItem];
}>();

const title = ref('添加费用项目');
const name = ref('');
const amount = ref(0);

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;

    if (props.item) {
      title.value = '编辑费用项目';
      name.value = props.item.name;
      amount.value = props.item.amount;
    } else {
      title.value = '添加费用项目';
      name.value = '';
      amount.value = 0;
    }
  }
);

function confirm() {
  const trimmed = name.value.trim();
  if (!trimmed) return;

  emit('save', { name: trimmed, amount: amount.value });
  emit('update:modelValue', false);
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-width="80px">
      <el-form-item label="费用名称" required>
        <el-input v-model="name" placeholder="如：网费、保洁费" />
      </el-form-item>
      <el-form-item label="金额" required>
        <div class="custom-fee-amount-row">
          <el-input-number
            v-model="amount"
            :min="0"
            :step="50"
            controls-position="right"
          />
          <span class="custom-fee-amount-unit">元/月</span>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!name.trim()" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.custom-fee-amount-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.custom-fee-amount-row :deep(.el-input-number) {
  flex: 1 1 auto;
  min-width: 0;
}

.custom-fee-amount-unit {
  flex: 0 0 auto;
  color: var(--app-text-regular);
}
</style>
