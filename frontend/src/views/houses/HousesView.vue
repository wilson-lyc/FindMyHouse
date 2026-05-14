<script setup lang="ts">
import { inject } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import HouseListCard from '../../components/house/HouseListCard.vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';
import { houseSourceChannelLabels, houseSourceChannels, houseStatuses } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';

const context = inject<MainLayoutContext>(mainLayoutContextKey);

if (!context) {
  throw new Error('HousesView must be used inside MainLayout.');
}
</script>

<template>
  <div class="map-houses-pane">
    <div class="map-house-controls">
      <div class="map-house-control-row">
        <el-button type="primary" :icon="Plus" @click="context.openCreateDialog">添加房源</el-button>
        <el-checkbox
          v-model="context.onlyViewportHouses.value"
          @change="(enabled: string | number | boolean) => context.toggleViewportHouses(Boolean(enabled))"
        >
          仅视野
        </el-checkbox>
      </div>
      <div class="map-house-control-row map-house-filter-row">
        <el-select v-model="context.filters.status" clearable placeholder="状态" @change="context.applyHouseFilters">
          <el-option v-for="status in houseStatuses" :key="status" :label="statusLabels[status]" :value="status" />
        </el-select>
        <el-select v-model="context.filters.sourceChannel" clearable placeholder="渠道" @change="context.applyHouseFilters">
          <el-option
            v-for="channel in houseSourceChannels"
            :key="channel"
            :label="houseSourceChannelLabels[channel]"
            :value="channel"
          />
        </el-select>
      </div>
    </div>

    <div v-loading="context.loading.value" class="house-card-list map-data-list">
      <el-empty v-if="!context.loading.value && !context.houses.value.length" description="暂无房源数据" />
      <template v-else>
        <HouseListCard
          v-for="house in context.houses.value"
          :key="house.id"
          :house="house"
          :driving-distance="context.drivingRoutes.value.get(house.id)"
          :focus-location-name="context.focusLocation.value?.name"
          @select="context.selectHouse"
          @edit="context.openEditDialog"
          @delete="context.confirmDeleteHouse"
          @route="context.showRoute"
        />
      </template>
    </div>
  </div>
</template>
