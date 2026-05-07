<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Edit, List, MapLocation, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatCurrency } from '../../../shared/utils/format';
import LocationFormDialog from '../../locations/components/LocationFormDialog.vue';
import LocationPanel from '../../locations/components/LocationPanel.vue';
import { createLocation, deleteLocation, fetchLocations, updateLocation } from '../../locations/api/locations-api';
import { normalizeLocationForm } from '../../locations/lib/location-form';
import type { Location, LocationFilters, LocationForm } from '../../locations/model/location';
import AmapListingMap from '../../maps/components/AmapListingMap.vue';
import type { MapBoundsFilter } from '../../maps/model/geocode';
import ListingFormDialog from '../components/ListingFormDialog.vue';
import ListingSummary from '../components/ListingSummary.vue';
import ListingTable from '../components/ListingTable.vue';
import ListingToolbar from '../components/ListingToolbar.vue';
import { useListings } from '../composables/useListings';
import { normalizeListingForm } from '../lib/listing-form';
import type { Listing, ListingForm } from '../model/listing';
import { statusLabels, statusType } from '../model/listing-status';

const {
  listings,
  loading,
  saving,
  filters,
  averageRent,
  shortlistedCount,
  loadListings,
  saveListing,
  removeListing
} = useListings();

const dialogVisible = ref(false);
const editingListing = ref<Listing | null>(null);
const locationDialogVisible = ref(false);
const editingLocation = ref<Location | null>(null);
const locations = ref<Location[]>([]);
const locationsLoading = ref(false);
const locationSaving = ref(false);
const selectedListing = ref<Listing | null>(null);
const viewMode = ref<'list' | 'map'>('list');
const locationFilters = reactive<LocationFilters>({
  q: '',
  category: ''
});

const hasMapBoundsFilter = computed(() => filters.minLatitude !== undefined);
const mappedListings = computed(() =>
  listings.value.filter((listing) => listing.latitude !== undefined && listing.longitude !== undefined)
);

function openCreateDialog() {
  editingListing.value = null;
  dialogVisible.value = true;
}

function openEditDialog(listing: Listing) {
  editingListing.value = listing;
  dialogVisible.value = true;
}

async function submitListing(form: ListingForm) {
  try {
    await saveListing(normalizeListingForm(form), editingListing.value);
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  }
}

async function confirmDelete(listing: Listing) {
  try {
    await ElMessageBox.confirm(`确认删除「${listing.title}」吗？`, '删除房源', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await removeListing(listing);
  } catch {
    // User cancelled the confirmation dialog.
  }
}

function openCreateLocationDialog() {
  editingLocation.value = null;
  locationDialogVisible.value = true;
}

function openEditLocationDialog(location: Location) {
  editingLocation.value = location;
  locationDialogVisible.value = true;
}

async function loadLocations() {
  locationsLoading.value = true;
  try {
    locations.value = await fetchLocations(locationFilters);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载地点失败');
  } finally {
    locationsLoading.value = false;
  }
}

async function submitLocation(form: LocationForm) {
  locationSaving.value = true;
  try {
    const payload = normalizeLocationForm(form);
    if (editingLocation.value) {
      await updateLocation(editingLocation.value.id, payload);
      ElMessage.success('地点已更新');
    } else {
      await createLocation(payload);
      ElMessage.success('地点已创建');
    }

    locationDialogVisible.value = false;
    await loadLocations();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存地点失败');
  } finally {
    locationSaving.value = false;
  }
}

async function confirmDeleteLocation(location: Location) {
  try {
    await ElMessageBox.confirm(`确认删除「${location.name}」吗？`, '删除地点', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await deleteLocation(location.id);
    ElMessage.success('地点已删除');
    await loadLocations();
  } catch {
    // User cancelled the confirmation dialog.
  }
}

async function applyMapBounds(bounds: MapBoundsFilter) {
  Object.assign(filters, bounds);
  await loadListings();
}

async function clearMapBounds() {
  filters.minLatitude = undefined;
  filters.maxLatitude = undefined;
  filters.minLongitude = undefined;
  filters.maxLongitude = undefined;
  await loadListings();
}

function selectListing(listing: Listing) {
  selectedListing.value = listing;
}

function switchViewMode(mode: 'list' | 'map') {
  viewMode.value = mode;
}

onMounted(async () => {
  await Promise.all([loadListings(), loadLocations()]);
});
</script>

<template>
  <main class="app-shell" :class="{ 'app-shell--map': viewMode === 'map' }">
    <section class="page-header">
      <div>
        <p class="eyebrow">FindMyHouse</p>
        <h1>房源工作台</h1>
      </div>
      <div class="header-actions">
        <el-radio-group v-model="viewMode" @change="switchViewMode">
          <el-radio-button label="list">
            <el-icon><List /></el-icon>
            列表模式
          </el-radio-button>
          <el-radio-button label="map">
            <el-icon><MapLocation /></el-icon>
            大屏地图
          </el-radio-button>
        </el-radio-group>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增房源</el-button>
      </div>
    </section>

    <template v-if="viewMode === 'list'">
      <ListingSummary :total="listings.length" :average-rent="averageRent" :shortlisted-count="shortlistedCount" />
      <ListingToolbar :filters="filters" @search="loadListings" />

      <section class="workspace-grid">
        <div class="list-column">
          <div v-if="hasMapBoundsFilter" class="bounds-banner">
            <span>列表已按当前地图视野筛选</span>
            <el-button link type="primary" @click="clearMapBounds">取消视野筛选</el-button>
          </div>
          <ListingTable
            :listings="listings"
            :loading="loading"
            @select="selectListing"
            @edit="openEditDialog"
            @delete="confirmDelete"
          />
        </div>

        <aside class="map-column">
          <AmapListingMap
            :listings="mappedListings"
            :locations="locations"
            :selected-listing-id="selectedListing?.id"
            @bounds-change="applyMapBounds"
            @select-listing="selectListing"
          />
          <LocationPanel
            :locations="locations"
            :loading="locationsLoading"
            @create="openCreateLocationDialog"
            @edit="openEditLocationDialog"
            @delete="confirmDeleteLocation"
          />
        </aside>
      </section>
    </template>

    <section v-else class="map-workbench">
      <AmapListingMap
        :listings="mappedListings"
        :locations="locations"
        :selected-listing-id="selectedListing?.id"
        @bounds-change="applyMapBounds"
        @select-listing="selectListing"
      />

      <div class="map-floating-toolbar">
        <ListingToolbar :filters="filters" @search="loadListings" />
        <div v-if="hasMapBoundsFilter" class="bounds-banner compact">
          <span>当前视野内 {{ listings.length }} 套</span>
          <el-button link type="primary" @click="clearMapBounds">取消</el-button>
        </div>
      </div>

      <aside class="map-list-drawer">
        <div class="panel-title-row">
          <div>
            <h2>房源</h2>
            <p class="muted">{{ listings.length }} 套结果，{{ mappedListings.length }} 套已定位</p>
          </div>
          <el-button :icon="Plus" type="primary" @click="openCreateDialog">新增</el-button>
        </div>
        <div v-loading="loading" class="listing-card-list">
          <button
            v-for="listing in listings"
            :key="listing.id"
            class="listing-card"
            :class="{ active: selectedListing?.id === listing.id }"
            type="button"
            @click="selectListing(listing)"
          >
            <span>
              <strong>{{ listing.title }}</strong>
              <el-tag :type="statusType(listing.status)" size="small">{{ statusLabels[listing.status] }}</el-tag>
            </span>
            <small>{{ listing.address }}</small>
            <b>{{ formatCurrency(listing.rentPrice) }}</b>
          </button>
        </div>
      </aside>

      <aside v-if="selectedListing" class="map-detail-panel">
        <div class="panel-title-row">
          <div>
            <h2>{{ selectedListing.title }}</h2>
            <p class="muted">{{ selectedListing.address }}</p>
          </div>
          <el-button :icon="Edit" @click="openEditDialog(selectedListing)">编辑</el-button>
        </div>
        <dl class="detail-grid">
          <div>
            <dt>月租</dt>
            <dd>{{ formatCurrency(selectedListing.rentPrice) }}</dd>
          </div>
          <div>
            <dt>面积</dt>
            <dd>{{ selectedListing.areaSqm ? `${selectedListing.areaSqm} m²` : '-' }}</dd>
          </div>
          <div>
            <dt>户型</dt>
            <dd>{{ selectedListing.layout || '-' }}</dd>
          </div>
          <div>
            <dt>来源</dt>
            <dd>{{ selectedListing.source || '-' }}</dd>
          </div>
        </dl>
        <p v-if="selectedListing.notes" class="detail-notes">{{ selectedListing.notes }}</p>
      </aside>

      <aside class="map-location-panel">
        <LocationPanel
          :locations="locations"
          :loading="locationsLoading"
          @create="openCreateLocationDialog"
          @edit="openEditLocationDialog"
          @delete="confirmDeleteLocation"
        />
      </aside>

      <div class="map-bottom-summary">
        <span>{{ listings.length }} 套候选</span>
        <span>均租 {{ formatCurrency(averageRent) }}</span>
        <span>{{ shortlistedCount }} 套收藏</span>
        <span>{{ hasMapBoundsFilter ? '已按地图视野筛选' : '显示全部筛选结果' }}</span>
      </div>
    </section>

    <ListingFormDialog v-model="dialogVisible" :listing="editingListing" :saving="saving" @submit="submitListing" />
    <LocationFormDialog
      v-model="locationDialogVisible"
      :location="editingLocation"
      :saving="locationSaving"
      @submit="submitLocation"
    />
  </main>
</template>
