<script setup lang="ts">
import { Delete, Edit } from '@element-plus/icons-vue';
import { formatCurrency } from '../../lib/format';
import { statusLabels, statusType } from '../../model/house/house-status';
import { houseSourceChannelLabels, type House } from '../../model/house/house';

defineProps<{
  house: House;
}>();

const emit = defineEmits<{
  select: [house: House];
  edit: [house: House];
  delete: [house: House];
}>();

function formatFeeLabel(value: number | undefined, suffix: string) {
  if (value === undefined) return '-';

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2
  }).format(value) + suffix;
}
</script>

<template>
  <el-card
    class="house-card"
    shadow="never"
    @click="emit('select', house)"
  >
    <div class="house-card-header">
      <strong>{{ house.name }}</strong>
      <el-tag :type="statusType(house.status)" size="small">{{ statusLabels[house.status] }}</el-tag>
    </div>
    <small>
      {{ house.bedroomCount }}房{{ house.livingRoomCount }}厅{{ house.bathroomCount }}卫
      <template v-if="house.sourceChannel"> · {{ houseSourceChannelLabels[house.sourceChannel] }}</template>
    </small>
    <div class="house-card-fees">
      <div class="fee-row">
        <span class="fee-label">租金</span>
        <span class="fee-value">{{ formatCurrency(house.rentPrice) }}</span>
      </div>
      <div class="fee-row">
        <span class="fee-label">物业</span>
        <span class="fee-value">{{ formatFeeLabel(house.propertyFee, '/月') }}</span>
      </div>
      <div class="fee-row">
        <span class="fee-label">水费</span>
        <span class="fee-value">{{ formatFeeLabel(house.waterFeePerTon, '/吨') }}</span>
      </div>
      <div class="fee-row">
        <span class="fee-label">电费</span>
        <span class="fee-value">{{ formatFeeLabel(house.electricityFeePerKwh, '/度') }}</span>
      </div>
    </div>
    <div class="house-card-actions">
      <el-button link type="primary" :icon="Edit" @click.stop="emit('edit', house)">详情</el-button>
      <el-button link type="danger" :icon="Delete" @click.stop="emit('delete', house)">删除</el-button>
    </div>
  </el-card>
</template>
