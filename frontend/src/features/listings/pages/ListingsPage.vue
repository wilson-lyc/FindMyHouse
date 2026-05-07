<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
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
const locationFilters = reactive<LocationFilters>({
  q: '',
  category: ''
});

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

onMounted(async () => {
  await Promise.all([loadListings(), loadLocations()]);
});
</script>

<template>
  <main class="app-shell">
    <section class="page-header">
      <div>
        <p class="eyebrow">FindMyHouse</p>
        <h1>房源工作台</h1>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增房源</el-button>
    </section>

    <ListingSummary :total="listings.length" :average-rent="averageRent" :shortlisted-count="shortlistedCount" />
    <ListingToolbar :filters="filters" @search="loadListings" />

    <section class="workspace-grid">
      <div class="list-column">
        <div v-if="filters.minLatitude !== undefined" class="bounds-banner">
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

    <ListingFormDialog v-model="dialogVisible" :listing="editingListing" :saving="saving" @submit="submitListing" />
    <LocationFormDialog
      v-model="locationDialogVisible"
      :location="editingLocation"
      :saving="locationSaving"
      @submit="submitLocation"
    />
  </main>
</template>
