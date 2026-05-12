<script setup lang="ts">
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import type { Location } from '../../model/location/location';
import { locationCategoryLabels } from '../../model/location/location';

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
    <div class="map-house-controls">
      <div class="map-house-control-row map-house-control-row--single">
        <el-button type="primary" :icon="Plus" @click="emit('create')">添加地点</el-button>
      </div>
    </div>

    <div v-loading="loading" class="location-list map-data-list">
      <el-empty v-if="!loading && !locations.length" description="暂无地点数据" />
      <template v-else>
        <article v-for="location in locations" :key="location.id" class="location-item">
          <div class="location-item-header">
            <strong>{{ location.name }}</strong>
            <div class="location-item-tags">
              <el-tag v-if="location.isFocus" type="success" size="small">焦点</el-tag>
              <el-tag size="small">{{ locationCategoryLabels[location.category] }}</el-tag>
            </div>
          </div>
          <div class="house-card-actions">
            <el-button link type="primary" :icon="Edit" @click="emit('edit', location)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="emit('delete', location)">删除</el-button>
          </div>
        </article>
      </template>
    </div>
  </section>
</template>
