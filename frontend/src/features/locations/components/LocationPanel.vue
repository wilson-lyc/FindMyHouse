<script setup lang="ts">
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import type { Location } from '../model/location';
import { locationCategoryLabels } from '../model/location';

defineProps<{
  locations: Location[];
  loading: boolean;
}>();

const emit = defineEmits<{
  create: [];
  edit: [location: Location];
  delete: [location: Location];
}>();
</script>

<template>
  <section class="location-panel">
    <div class="map-listing-controls">
      <div class="map-listing-control-row map-listing-control-row--single">
        <el-button type="primary" :icon="Plus" @click="emit('create')">添加地点</el-button>
      </div>
    </div>

    <div v-loading="loading" class="location-list map-data-list">
      <el-empty v-if="!loading && !locations.length" description="暂无地点数据" />
      <template v-else>
        <article v-for="location in locations" :key="location.id" class="location-item">
          <div class="location-item-header">
            <strong>{{ location.name }}</strong>
            <span>{{ locationCategoryLabels[location.category] }}</span>
          </div>
          <p>{{ location.address }}</p>
          <p v-if="location.latitude && location.longitude" class="muted">
            {{ location.longitude.toFixed(6) }}, {{ location.latitude.toFixed(6) }}
          </p>
          <div class="location-actions">
            <el-button link type="primary" :icon="Edit" @click="emit('edit', location)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="emit('delete', location)">删除</el-button>
          </div>
        </article>
      </template>
    </div>
  </section>
</template>
