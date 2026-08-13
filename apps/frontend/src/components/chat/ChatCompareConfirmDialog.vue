<script setup lang="ts">
import { formatCurrency } from '../../lib/format';
import { statusLabels } from '../../model/house/house-status';
import type { House } from '../../model/house/house';

const props = defineProps<{
  visible: boolean;
  houses: House[];
  title?: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  confirm: [houses: House[]];
  cancel: [];
}>();

function handleConfirm() {
  emit('confirm', props.houses);
}

function handleCancel() {
  emit('cancel');
}

function handleVisibleChange(visible: boolean) {
  if (visible) {
    emit('update:visible', visible);
    return;
  }
  handleCancel();
}

function formatHouseStatus(house: House) {
  return statusLabels[house.status];
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title ?? '确认对比房源'"
    width="720px"
    class="chat-compare-confirm-dialog"
    @update:model-value="handleVisibleChange"
  >
    <el-table :data="houses" max-height="360">
      <el-table-column label="房源" min-width="180">
        <template #default="{ row }">
          <div class="chat-compare-confirm-name">{{ row.name }}</div>
          <div class="chat-compare-confirm-address">{{ row.address }}</div>
        </template>
      </el-table-column>
      <el-table-column label="月租" width="100">
        <template #default="{ row }">{{ formatCurrency(row.rentPrice) }}</template>
      </el-table-column>
      <el-table-column label="户型" width="110">
        <template #default="{ row }">{{ row.bedroomCount }}室{{ row.livingRoomCount }}厅{{ row.bathroomCount }}卫</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ formatHouseStatus(row) }}</template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认并开始分析</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.chat-compare-confirm-name {
  font-weight: 600;
  line-height: 1.4;
}

.chat-compare-confirm-address {
  margin-top: 3px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}
</style>
