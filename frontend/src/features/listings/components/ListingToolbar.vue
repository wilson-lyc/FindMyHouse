<script setup lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue';
import { listingStatuses, type ListingFilters } from '../model/listing';
import { statusLabels } from '../model/listing-status';

defineProps<{
  filters: ListingFilters;
}>();

const emit = defineEmits<{
  search: [];
}>();
</script>

<template>
  <section class="toolbar">
    <el-input
      v-model="filters.q"
      :prefix-icon="Search"
      clearable
      placeholder="搜索标题、地址或备注"
      @keyup.enter="emit('search')"
    />
    <el-select v-model="filters.status" clearable placeholder="全部状态">
      <el-option v-for="status in listingStatuses" :key="status" :label="statusLabels[status]" :value="status" />
    </el-select>
    <el-button :icon="Refresh" @click="emit('search')">刷新</el-button>
    <el-button type="primary" :icon="Search" @click="emit('search')">筛选</el-button>
  </section>
</template>
