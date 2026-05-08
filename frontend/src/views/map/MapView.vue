<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Cpu, House as HouseIcon, Location as LocationIcon, Plus, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import HouseFormDialog from '../../components/house/HouseFormDialog.vue';
import HouseListCard from '../../components/house/HouseListCard.vue';
import LocationFormDialog from '../../components/location/LocationFormDialog.vue';
import LocationPanel from '../../components/location/LocationPanel.vue';
import AmapHouseMap from '../../components/map/AmapHouseMap.vue';
import { useHouses } from '../../composables/house/useHouses';
import { useLocations } from '../../composables/location/useLocations';
import { normalizeHouseForm } from '../../lib/house/house-form';
import { houseSourceChannelLabels, houseSourceChannels, houseStatuses, type House, type HouseForm } from '../../model/house/house';
import { statusLabels } from '../../model/house/house-status';
import type { Location, LocationForm } from '../../model/location/location';
import type { MapBoundsFilter } from '../../model/map/geocode';

const {
  houses,
  loading,
  aiSearching,
  aiSearchPlan,
  saving,
  filters,
  loadHouses,
  aiSearchHouses,
  saveHouse,
  removeHouse
} = useHouses();
const { locations, loading: locationsLoading, saving: locationSaving, loadLocations, saveLocation, removeLocation } =
  useLocations();

const dialogVisible = ref(false);
const editingHouse = ref<House | null>(null);
const locationDialogVisible = ref(false);
const editingLocation = ref<Location | null>(null);
const selectedHouse = ref<House | null>(null);
const selectedHouseFocusKey = ref(0);
const activePanel = ref<'houses' | 'locations'>('houses');
const onlyViewportHouses = ref(false);
const currentMapBounds = ref<MapBoundsFilter | null>(null);
const aiSearchQuery = ref('');
const leftPanelWidth = ref(420);
const minLeftPanelWidth = 360;
const maxLeftPanelWidth = 760;

const mappedHouses = computed(() =>
  houses.value.filter((house) => house.latitude !== undefined && house.longitude !== undefined)
);

function openCreateDialog() {
  editingHouse.value = null;
  dialogVisible.value = true;
}

function openEditDialog(house: House) {
  editingHouse.value = house;
  dialogVisible.value = true;
}

async function submitHouse(form: HouseForm) {
  try {
    await saveHouse(normalizeHouseForm(form), editingHouse.value);
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  }
}

async function confirmDeleteHouse(house: House) {
  try {
    await ElMessageBox.confirm(`确认删除「${house.name}」吗？`, '删除房源', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await removeHouse(house);
    if (selectedHouse.value?.id === house.id) {
      selectedHouse.value = null;
    }
  } catch {
    // User cancelled the confirmation dialog.
  }
}

async function applyMapBounds(bounds: MapBoundsFilter) {
  currentMapBounds.value = bounds;
  if (!onlyViewportHouses.value) return;

  await applyHouseSearch();
}

async function applyHouseSearch() {
  if (onlyViewportHouses.value && currentMapBounds.value) {
    Object.assign(filters, currentMapBounds.value);
  } else {
    filters.minLatitude = undefined;
    filters.maxLatitude = undefined;
    filters.minLongitude = undefined;
    filters.maxLongitude = undefined;
  }

  await loadHouses();
}

async function applyAiHouseSearch() {
  const query = aiSearchQuery.value.trim();
  if (!query) {
    ElMessage.warning('请输入 AI 搜索词');
    return;
  }

  await aiSearchHouses(query);
}

async function toggleViewportHouses() {
  await applyHouseSearch();
}

function selectHouse(house: House) {
  selectedHouse.value = house;
  selectedHouseFocusKey.value += 1;
}

function showPanel(panel: string) {
  activePanel.value = panel === 'locations' ? 'locations' : 'houses';
}

function notifyMapResize() {
  window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

function openCreateLocationDialog() {
  editingLocation.value = null;
  locationDialogVisible.value = true;
}

function openEditLocationDialog(location: Location) {
  editingLocation.value = location;
  locationDialogVisible.value = true;
}

async function submitLocation(form: LocationForm) {
  try {
    await saveLocation(form, editingLocation.value);
    locationDialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存地点失败');
  }
}

async function confirmDeleteLocation(location: Location) {
  try {
    await ElMessageBox.confirm(`确认删除「${location.name}」吗？`, '删除地点', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await removeLocation(location);
  } catch {
    // User cancelled the confirmation dialog.
  }
}

onMounted(async () => {
  await Promise.all([loadHouses(), loadLocations()]);
});
</script>

<template>
  <main class="map-page">
    <el-splitter @resize-end="notifyMapResize">
      <el-splitter-panel v-model:size="leftPanelWidth" :min="minLeftPanelWidth" :max="maxLeftPanelWidth">
        <aside class="map-data-panel">
        <nav class="map-directory-rail" aria-label="地图数据目录">
          <el-menu class="map-directory-menu" :default-active="activePanel" @select="showPanel">
            <el-menu-item index="houses">
              <el-icon><HouseIcon /></el-icon>
              <span>房源</span>
            </el-menu-item>
            <el-menu-item index="locations">
              <el-icon><LocationIcon /></el-icon>
              <span>地点</span>
            </el-menu-item>
          </el-menu>
        </nav>

        <section class="map-data-content">
          <div v-if="activePanel === 'houses'" class="map-houses-pane">
            <div class="map-house-controls">
              <div class="map-house-control-row">
                <el-button type="primary" :icon="Plus" @click="openCreateDialog">添加房源</el-button>
                <el-checkbox v-model="onlyViewportHouses" @change="toggleViewportHouses">仅视野</el-checkbox>
              </div>
              <div class="map-house-ai-row">
                <el-input
                  v-model="aiSearchQuery"
                  :prefix-icon="Cpu"
                  clearable
                  placeholder="AI 搜索：如 5000 内一室，靠近地铁"
                  @keyup.enter="applyAiHouseSearch"
                />
                <el-button type="primary" :loading="aiSearching" @click="applyAiHouseSearch">AI 搜索</el-button>
              </div>
              <div class="map-house-control-row map-house-filter-row">
                <el-select v-model="filters.status" clearable placeholder="状态" @change="applyHouseSearch">
                  <el-option
                    v-for="status in houseStatuses"
                    :key="status"
                    :label="statusLabels[status]"
                    :value="status"
                  />
                </el-select>
                <el-select v-model="filters.sourceChannel" clearable placeholder="渠道" @change="applyHouseSearch">
                  <el-option
                    v-for="channel in houseSourceChannels"
                    :key="channel"
                    :label="houseSourceChannelLabels[channel]"
                    :value="channel"
                  />
                </el-select>
                <el-input
                  v-model="filters.q"
                  :prefix-icon="Search"
                  clearable
                  placeholder="搜索房源"
                  @clear="applyHouseSearch"
                  @keyup.enter="applyHouseSearch"
                />
              </div>
            </div>

            <section v-if="aiSearchPlan" class="house-ai-plan" aria-label="AI 搜索过程">
              <div class="house-ai-plan-header">
                <span>AI 搜索过程</span>
                <el-tag size="small">{{ aiSearchPlan.houses.length }} 套</el-tag>
              </div>
              <p v-if="aiSearchPlan.explanation">{{ aiSearchPlan.explanation }}</p>
              <ol v-if="aiSearchPlan.steps.length">
                <li v-for="step in aiSearchPlan.steps" :key="step">{{ step }}</li>
              </ol>
              <dl>
                <template v-if="aiSearchPlan.filters.keywords?.length">
                  <dt>关键词</dt>
                  <dd>{{ aiSearchPlan.filters.keywords.join('、') }}</dd>
                </template>
                <template v-if="aiSearchPlan.filters.minRentPrice !== undefined || aiSearchPlan.filters.maxRentPrice !== undefined">
                  <dt>租金</dt>
                  <dd>
                    {{ aiSearchPlan.filters.minRentPrice ?? '不限' }} -
                    {{ aiSearchPlan.filters.maxRentPrice ?? '不限' }}
                  </dd>
                </template>
                <template v-if="aiSearchPlan.filters.minBedroomCount !== undefined || aiSearchPlan.filters.maxBedroomCount !== undefined">
                  <dt>卧室</dt>
                  <dd>
                    {{ aiSearchPlan.filters.minBedroomCount ?? '不限' }} -
                    {{ aiSearchPlan.filters.maxBedroomCount ?? '不限' }}
                  </dd>
                </template>
                <template v-if="aiSearchPlan.filters.q">
                  <dt>全文</dt>
                  <dd>{{ aiSearchPlan.filters.q }}</dd>
                </template>
              </dl>
            </section>

            <div v-loading="loading" class="house-card-list map-data-list">
              <el-empty v-if="!loading && !houses.length" description="暂无房源数据" />
              <template v-else>
                <HouseListCard
                  v-for="house in houses"
                  :key="house.id"
                  :house="house"
                  @select="selectHouse"
                  @edit="openEditDialog"
                  @delete="confirmDeleteHouse"
                />
              </template>
            </div>
          </div>
          <LocationPanel
            v-else
            :locations="locations"
            :loading="locationsLoading"
            @create="openCreateLocationDialog"
            @edit="openEditLocationDialog"
            @delete="confirmDeleteLocation"
          />
        </section>
        </aside>
      </el-splitter-panel>
      <el-splitter-panel>
        <div class="map-canvas-panel">
        <AmapHouseMap
          :houses="mappedHouses"
          :locations="locations"
          :selected-house-id="selectedHouse?.id"
          :selected-house-focus-key="selectedHouseFocusKey"
          @bounds-change="applyMapBounds"
          @edit-house="openEditDialog"
          @select-house="selectHouse"
        />
        </div>
      </el-splitter-panel>
    </el-splitter>
    <HouseFormDialog v-model="dialogVisible" :house="editingHouse" :saving="saving" @submit="submitHouse" />
    <LocationFormDialog
      v-model="locationDialogVisible"
      :location="editingLocation"
      :saving="locationSaving"
      @submit="submitLocation"
    />
  </main>
</template>
