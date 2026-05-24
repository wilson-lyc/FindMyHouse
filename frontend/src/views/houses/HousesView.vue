<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Tickets } from '@element-plus/icons-vue';
import HouseListCard from '../../components/house/HouseListCard.vue';
import { mainLayoutContextKey, type MainLayoutContext } from '../../context/main-layout-context';
import { houseSourceChannelLabels, houseSourceChannels, houseStatuses, type House } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import { useHouseCompareStore } from '../../stores/houseCompareStore';
import { useHouseDialogStore } from '../../stores/houseDialogStore';
import { useMapStore } from '../../stores/mapStore';
import { useScheduleFormDialogStore } from '../../stores/scheduleFormDialogStore';
import { commuteModeLabels } from '../../model/map/geocode';

const context = inject<MainLayoutContext>(mainLayoutContextKey);

if (!context) {
  throw new Error('HousesView must be used inside MainLayout.');
}

const layoutContext = context;
const houseCompareStore = useHouseCompareStore();
const houseDialogStore = useHouseDialogStore();
const scheduleFormDialogStore = useScheduleFormDialogStore();
const mapStore = useMapStore();
const maxCompareCount = 4;
const compareSelectedIds = ref<string[]>([]);

const compareSelectedHouses = computed(() =>
  compareSelectedIds.value
    .map((id) => layoutContext.houses.value.find((house) => house.id === id))
    .filter((house): house is House => Boolean(house))
);

function isCompareSelected(house: House) {
  return compareSelectedIds.value.includes(house.id);
}

function isCompareDisabled(house: House) {
  return !isCompareSelected(house) && compareSelectedIds.value.length >= maxCompareCount;
}

function toggleCompareHouse(house: House, selected: boolean) {
  if (selected) {
    if (compareSelectedIds.value.length >= maxCompareCount) {
      ElMessage.info(`最多选择 ${maxCompareCount} 套房源`);
      return;
    }

    compareSelectedIds.value = [...compareSelectedIds.value, house.id];
    return;
  }

  removeCompareHouse(house);
}

function removeCompareHouse(house: House) {
  compareSelectedIds.value = compareSelectedIds.value.filter((id) => id !== house.id);
}

function clearCompareSelection() {
  compareSelectedIds.value = [];
}

function openCompareDialog() {
  if (compareSelectedIds.value.length < 2) {
    ElMessage.info('至少选择两套房源开始对比');
    return;
  }

  houseCompareStore.open(compareSelectedHouses.value);
}

watch(
  () => layoutContext.houses.value.map((house) => house.id).join('|'),
  () => {
    compareSelectedIds.value = compareSelectedIds.value.filter((id) => layoutContext.houses.value.some((house) => house.id === id));
  }
);
</script>

<template>
  <div class="map-houses-pane" :class="{ 'has-compare-cart': compareSelectedHouses.length > 0 }">
    <div class="map-house-controls">
      <div class="map-house-control-row">
        <el-button type="primary" :icon="Plus" @click="houseDialogStore.openCreate">添加房源</el-button>
        <el-button :icon="Tickets" :disabled="compareSelectedIds.length < 2" @click="openCompareDialog">
          对比 {{ compareSelectedIds.length ? `(${compareSelectedIds.length})` : '' }}
        </el-button>
        <el-checkbox
          v-model="layoutContext.onlyViewportHouses.value"
          @change="(enabled: string | number | boolean) => layoutContext.toggleViewportHouses(Boolean(enabled))"
        >
          仅视野
        </el-checkbox>
      </div>
      <div class="map-house-control-row map-house-filter-row">
        <el-select v-model="layoutContext.filters.status" clearable placeholder="状态" @change="layoutContext.applyHouseFilters">
          <el-option v-for="status in houseStatuses" :key="status" :label="statusLabels[status]" :value="status" />
        </el-select>
        <el-select v-model="layoutContext.filters.sourceChannel" clearable placeholder="渠道" @change="layoutContext.applyHouseFilters">
          <el-option
            v-for="channel in houseSourceChannels"
            :key="channel"
            :label="houseSourceChannelLabels[channel]"
            :value="channel"
          />
        </el-select>
        <el-select v-model="mapStore.commuteMode" placeholder="通勤方式">
          <el-option
            v-for="[mode, label] in Object.entries(commuteModeLabels)"
            :key="mode"
            :label="label"
            :value="mode"
          />
        </el-select>
      </div>
    </div>

    <div v-if="compareSelectedHouses.length" class="house-compare-cart">
      <span>已选 {{ compareSelectedHouses.length }}/{{ maxCompareCount }}</span>
      <div>
        <el-tag
          v-for="house in compareSelectedHouses"
          :key="house.id"
          closable
          :disable-transitions="true"
          @close="removeCompareHouse(house)"
        >
          {{ house.name }}
        </el-tag>
      </div>
      <el-button link type="primary" :disabled="compareSelectedHouses.length === 0" @click="clearCompareSelection">清空</el-button>
    </div>

    <div v-loading="layoutContext.loading.value" class="house-card-list map-data-list">
      <el-empty v-if="!layoutContext.loading.value && !layoutContext.houses.value.length" description="暂无房源数据" />
      <template v-else>
        <HouseListCard
          v-for="house in layoutContext.houses.value"
          :key="house.id"
          :house="house"
          :driving-distance="layoutContext.routes.value.get(house.id)"
          :focus-location-name="layoutContext.focusLocation.value?.name"
          :commute-mode="mapStore.commuteMode"
          :compare-selected="isCompareSelected(house)"
          :compare-disabled="isCompareDisabled(house)"
          @select="layoutContext.selectHouse"
          @edit="houseDialogStore.openEdit"
          @delete="layoutContext.confirmDeleteHouse"
          @schedule="(house: House) => scheduleFormDialogStore.openWithHouse(house.id)"
          @route="layoutContext.showRoute"
          @compare-change="toggleCompareHouse"
        />
      </template>
    </div>
  </div>
</template>
