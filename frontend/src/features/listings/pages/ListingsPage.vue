<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MapLocation, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import LocationFormDialog from '../../locations/components/LocationFormDialog.vue';
import LocationPanel from '../../locations/components/LocationPanel.vue';
import { useLocations } from '../../locations/composables/useLocations';
import type { Location, LocationForm } from '../../locations/model/location';
import AmapListingMap from '../../maps/components/AmapListingMap.vue';
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
const selectedListing = ref<Listing | null>(null);
const { locations, loading: locationsLoading, saving: locationSaving, loadLocations, saveLocation, removeLocation } =
  useLocations();

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

function openCreateLocationDialog() {
  editingLocation.value = null;
  locationDialogVisible.value = true;
}

function openEditLocationDialog(location: Location) {
  editingLocation.value = location;
  locationDialogVisible.value = true;
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
        <h1>后台配置</h1>
      </div>
      <div class="header-actions">
        <el-button :icon="MapLocation" tag="a" href="/map">地图主页</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增房源</el-button>
      </div>
    </section>

    <ListingSummary :total="listings.length" :average-rent="averageRent" :shortlisted-count="shortlistedCount" />
    <ListingToolbar :filters="filters" @search="loadListings" />

    <section class="workspace-grid">
      <div class="list-column">
        <div v-if="hasMapBoundsFilter" class="bounds-banner">
          <span>列表已按地图视野筛选</span>
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
