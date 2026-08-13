<script setup lang="ts">
import { Aim, Delete, Edit, Plus } from '@element-plus/icons-vue';
import type { Location } from '../../model/location/location';
import { locationCategoryLabels } from '../../model/location/location';
import { useMapStore, type IsochroneMode } from '../../stores/mapStore';

defineProps<{
  locations: Location[];
  loading: boolean;
}>();

const emit = defineEmits<{
  create: [];
  edit: [location: Location];
  delete: [location: Location];
  'set-focus': [location: Location];
}>();

const mapStore = useMapStore();

function showIsochrone(location: Location, mode: IsochroneMode) {
  mapStore.showIsochrone(location, mode);
}
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
            <el-dropdown
              v-if="location.longitude !== undefined && location.latitude !== undefined"
              trigger="click"
              @command="(mode: IsochroneMode) => showIsochrone(location, mode)"
            >
              <el-button link type="success" :icon="Aim">等时圈</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="driving">驾车 10/20/30 分钟</el-dropdown-item>
                  <el-dropdown-item command="transit">公交 10/20/30 分钟</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              v-if="location.longitude !== undefined && location.latitude !== undefined"
              link
              type="success"
              :icon="Aim"
              @click="mapStore.showDistanceRing(location)"
            >
              等距圈
            </el-button>
            <el-button v-if="!location.isFocus" link type="warning" :icon="Aim" @click="emit('set-focus', location)">设为焦点</el-button>
            <el-button link type="primary" :icon="Edit" @click="emit('edit', location)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="emit('delete', location)">删除</el-button>
          </div>
        </article>
      </template>
    </div>
  </section>
</template>
