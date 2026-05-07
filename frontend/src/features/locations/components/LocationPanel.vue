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
    <div class="panel-title-row">
      <div>
        <h2>关键地点</h2>
        <p class="muted">公司、学校和常用地点会和房源一起显示在地图上。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="emit('create')">新增地点</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="4" animated />
    <el-empty v-else-if="!locations.length" description="还没有关键地点" />
    <div v-else class="location-list">
      <article v-for="location in locations" :key="location.id" class="location-item">
        <div>
          <strong>{{ location.name }}</strong>
          <span>{{ locationCategoryLabels[location.category] }}</span>
        </div>
        <p>{{ location.address }}</p>
        <p v-if="location.latitude && location.longitude" class="muted">{{ location.longitude.toFixed(6) }}, {{ location.latitude.toFixed(6) }}</p>
        <div class="location-actions">
          <el-button link type="primary" :icon="Edit" @click="emit('edit', location)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="emit('delete', location)">删除</el-button>
        </div>
      </article>
    </div>
  </section>
</template>
