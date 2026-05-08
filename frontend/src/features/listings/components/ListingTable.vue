<script setup lang="ts">
import { Delete, Edit } from '@element-plus/icons-vue';
import { formatCurrency } from '../../../shared/utils/format';
import type { Listing, ListingStatus } from '../model/listing';
import { statusLabels, statusType } from '../model/listing-status';

defineProps<{
  listings: Listing[];
  loading: boolean;
}>();

const emit = defineEmits<{
  edit: [listing: Listing];
  delete: [listing: Listing];
  select: [listing: Listing];
}>();

function formatFeeSummary(listing: Listing) {
  const fees = [
    ['物业', listing.propertyFee],
    ['水', listing.waterFeePerTon === undefined ? undefined : `${listing.waterFeePerTon}/吨`],
    ['电', listing.electricityFeePerKwh === undefined ? undefined : `${listing.electricityFeePerKwh}/度`],
    ['网费', listing.internetFee],
    ['公摊', listing.sharedFee],
    ['其他', listing.otherFee]
  ];

  const visibleFees = fees
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => `${label} ${typeof value === 'number' ? formatCurrency(value) : value}`);

  return visibleFees.length ? visibleFees.join(' / ') : '-';
}
</script>

<template>
  <el-table
    v-loading="loading"
    :data="listings"
    class="listings-table"
    empty-text="还没有房源，先新增一套看看"
    @row-click="emit('select', $event)"
  >
    <el-table-column prop="title" label="房源" min-width="220">
      <template #default="{ row }">
        <div class="listing-title">{{ row.title }}</div>
        <div class="muted listing-address">{{ row.address }}</div>
      </template>
    </el-table-column>
    <el-table-column label="月租" width="130">
      <template #default="{ row }">{{ formatCurrency(row.rentPrice) }}</template>
    </el-table-column>
    <el-table-column label="费用" min-width="220">
      <template #default="{ row }">{{ formatFeeSummary(row) }}</template>
    </el-table-column>
    <el-table-column label="面积" width="100">
      <template #default="{ row }">{{ row.areaSqm ? `${row.areaSqm} m²` : '-' }}</template>
    </el-table-column>
    <el-table-column prop="layout" label="户型" width="120" />
    <el-table-column label="状态" width="110">
      <template #default="{ row }">
        <el-tag :type="statusType(row.status)">{{ statusLabels[row.status as ListingStatus] }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="source" label="来源" width="120" />
    <el-table-column label="更新时间" width="180">
      <template #default="{ row }">{{ new Date(row.updatedAt).toLocaleString('zh-CN') }}</template>
    </el-table-column>
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" :icon="Edit" @click="emit('edit', row)">编辑</el-button>
        <el-button link type="danger" :icon="Delete" @click="emit('delete', row)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
