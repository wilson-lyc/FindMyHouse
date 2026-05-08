<script setup lang="ts">
import { Star, StarFilled } from '@element-plus/icons-vue';
import { formatCurrency } from '../../lib/format';
import { statusLabels, statusType } from '../../model/house/house-status';
import type { House } from '../../model/house/house';

defineProps<{
  house: House;
  selected: boolean;
  favorited: boolean;
}>();

const emit = defineEmits<{
  select: [house: House];
  edit: [house: House];
  delete: [house: House];
  'toggle-favorite': [houseId: string];
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
    :class="{ active: selected }"
    shadow="never"
    @click="emit('select', house)"
  >
    <div class="house-card-header">
      <strong>{{ house.title }}</strong>
      <el-tag :type="statusType(house.status)" size="small">{{ statusLabels[house.status] }}</el-tag>
    </div>
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
      <el-button size="small" @click.stop="emit('edit', house)">查看详情</el-button>
      <el-button
        size="small"
        :type="favorited ? 'warning' : 'default'"
        :icon="favorited ? StarFilled : Star"
        @click.stop="emit('toggle-favorite', house.id)"
      >
        {{ favorited ? '已收藏' : '收藏' }}
      </el-button>
      <el-button size="small" type="danger" @click.stop="emit('delete', house)">删除</el-button>
    </div>
  </el-card>
</template>
