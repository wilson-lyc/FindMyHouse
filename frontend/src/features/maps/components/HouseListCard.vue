<script setup lang="ts">
import { Star, StarFilled } from '@element-plus/icons-vue';
import { formatCurrency } from '../../../shared/utils/format';
import { statusLabels, statusType } from '../../listings/model/listing-status';
import type { Listing } from '../../listings/model/listing';

defineProps<{
  listing: Listing;
  selected: boolean;
  favorited: boolean;
}>();

const emit = defineEmits<{
  select: [listing: Listing];
  edit: [listing: Listing];
  delete: [listing: Listing];
  'toggle-favorite': [listingId: string];
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
    class="listing-card"
    :class="{ active: selected }"
    shadow="never"
    @click="emit('select', listing)"
  >
    <div class="listing-card-header">
      <strong>{{ listing.title }}</strong>
      <el-tag :type="statusType(listing.status)" size="small">{{ statusLabels[listing.status] }}</el-tag>
    </div>
    <div class="listing-card-fees">
      <div class="fee-row">
        <span class="fee-label">租金</span>
        <span class="fee-value">{{ formatCurrency(listing.rentPrice) }}</span>
      </div>
      <div class="fee-row">
        <span class="fee-label">物业</span>
        <span class="fee-value">{{ formatFeeLabel(listing.propertyFee, '/月') }}</span>
      </div>
      <div class="fee-row">
        <span class="fee-label">水费</span>
        <span class="fee-value">{{ formatFeeLabel(listing.waterFeePerTon, '/吨') }}</span>
      </div>
      <div class="fee-row">
        <span class="fee-label">电费</span>
        <span class="fee-value">{{ formatFeeLabel(listing.electricityFeePerKwh, '/度') }}</span>
      </div>
    </div>
    <div class="listing-card-actions">
      <el-button size="small" @click.stop="emit('edit', listing)">查看详情</el-button>
      <el-button
        size="small"
        :type="favorited ? 'warning' : 'default'"
        :icon="favorited ? StarFilled : Star"
        @click.stop="emit('toggle-favorite', listing.id)"
      >
        {{ favorited ? '已收藏' : '收藏' }}
      </el-button>
      <el-button size="small" type="danger" @click.stop="emit('delete', listing)">删除</el-button>
    </div>
  </el-card>
</template>
