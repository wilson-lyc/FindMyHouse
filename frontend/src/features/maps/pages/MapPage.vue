<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { House, Location as LocationIcon, Plus, Search, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatCurrency } from '../../../shared/utils/format';
import LocationFormDialog from '../../locations/components/LocationFormDialog.vue';
import LocationPanel from '../../locations/components/LocationPanel.vue';
import { useLocations } from '../../locations/composables/useLocations';
import type { Location, LocationForm } from '../../locations/model/location';
import ListingFormDialog from '../../listings/components/ListingFormDialog.vue';
import { useListings } from '../../listings/composables/useListings';
import { normalizeListingForm } from '../../listings/lib/listing-form';
import { listingStatuses, type Listing, type ListingForm } from '../../listings/model/listing';
import { statusLabels, statusType } from '../../listings/model/listing-status';
import AmapListingMap from '../components/AmapListingMap.vue';
import type { MapBoundsFilter } from '../model/geocode';

const {
  listings,
  loading,
  saving,
  filters,
  loadListings,
  saveListing,
  removeListing
} = useListings();
const { locations, loading: locationsLoading, saving: locationSaving, loadLocations, saveLocation, removeLocation } =
  useLocations();

const dialogVisible = ref(false);
const editingListing = ref<Listing | null>(null);
const locationDialogVisible = ref(false);
const editingLocation = ref<Location | null>(null);
const selectedListing = ref<Listing | null>(null);
const activePanel = ref<'listings' | 'locations'>('listings');
const onlyViewportListings = ref(true);
const currentMapBounds = ref<MapBoundsFilter | null>(null);
const mapShell = ref<HTMLElement>();
const leftPanelWidth = ref(420);
const isResizing = ref(false);
const minLeftPanelWidth = 360;
const maxLeftPanelWidth = 760;

const mappedListings = computed(() =>
  listings.value.filter((listing) => listing.latitude !== undefined && listing.longitude !== undefined)
);
const mapShellStyle = computed(() => ({
  '--map-left-panel-width': `${leftPanelWidth.value}px`
}));

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

async function confirmDeleteListing(listing: Listing) {
  try {
    await ElMessageBox.confirm(`确认删除「${listing.title}」吗？`, '删除房源', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });

    await removeListing(listing);
    if (selectedListing.value?.id === listing.id) {
      selectedListing.value = null;
    }
  } catch {
    // User cancelled the confirmation dialog.
  }
}

async function applyMapBounds(bounds: MapBoundsFilter) {
  currentMapBounds.value = bounds;
  if (!onlyViewportListings.value) return;

  await applyListingSearch();
}

async function applyListingSearch() {
  if (onlyViewportListings.value && currentMapBounds.value) {
    Object.assign(filters, currentMapBounds.value);
  } else {
    filters.minLatitude = undefined;
    filters.maxLatitude = undefined;
    filters.minLongitude = undefined;
    filters.maxLongitude = undefined;
  }

  await loadListings();
}

async function toggleViewportListings() {
  await applyListingSearch();
}

function selectListing(listing: Listing) {
  selectedListing.value = listing;
}

function showPanel(panel: string) {
  activePanel.value = panel === 'locations' ? 'locations' : 'listings';
}

function notifyMapResize() {
  window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

function startPanelResize(event: PointerEvent) {
  isResizing.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function resizePanel(event: PointerEvent) {
  if (!isResizing.value || !mapShell.value) return;

  const shellRect = mapShell.value.getBoundingClientRect();
  const shellMaxWidth = Math.max(minLeftPanelWidth, shellRect.width - 320);
  const nextWidth = event.clientX - shellRect.left;

  leftPanelWidth.value = Math.min(Math.min(maxLeftPanelWidth, shellMaxWidth), Math.max(minLeftPanelWidth, nextWidth));
  notifyMapResize();
}

function stopPanelResize(event: PointerEvent) {
  if (!isResizing.value) return;

  isResizing.value = false;
  (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  notifyMapResize();
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
  await Promise.all([loadListings(), loadLocations()]);
});

onBeforeUnmount(() => {
  isResizing.value = false;
});
</script>

<template>
  <main class="map-page" :class="{ 'map-page--resizing': isResizing }">
    <section ref="mapShell" class="map-split-shell" :style="mapShellStyle">
      <aside class="map-data-panel">
        <nav class="map-directory-rail" aria-label="地图数据目录">
          <el-menu class="map-directory-menu" :default-active="activePanel" @select="showPanel">
            <el-menu-item index="listings">
              <el-icon><House /></el-icon>
              <span>房源</span>
            </el-menu-item>
            <el-menu-item index="locations">
              <el-icon><LocationIcon /></el-icon>
              <span>地点</span>
            </el-menu-item>
          </el-menu>
          <div class="map-directory-bottom">
            <el-button
              class="map-directory-icon-button"
              tag="a"
              href="/admin/listings"
              :icon="Setting"
              text
              aria-label="后台配置"
              title="后台配置"
            />
          </div>
        </nav>

        <section class="map-data-content">
          <div v-if="activePanel === 'listings'" class="map-listings-pane">
            <div class="map-listing-controls">
              <div class="map-listing-control-row">
                <el-button type="primary" :icon="Plus" @click="openCreateDialog">添加房源</el-button>
                <el-checkbox v-model="onlyViewportListings" @change="toggleViewportListings">仅视野</el-checkbox>
              </div>
              <div class="map-listing-control-row">
                <el-select v-model="filters.status" clearable placeholder="筛选" @change="applyListingSearch">
                  <el-option
                    v-for="status in listingStatuses"
                    :key="status"
                    :label="statusLabels[status]"
                    :value="status"
                  />
                </el-select>
                <el-input
                  v-model="filters.q"
                  :prefix-icon="Search"
                  clearable
                  placeholder="搜索房源"
                  @clear="applyListingSearch"
                  @keyup.enter="applyListingSearch"
                />
              </div>
            </div>

            <div v-loading="loading" class="listing-card-list map-data-list">
              <el-card
                v-for="listing in listings"
                :key="listing.id"
                class="listing-card"
                :class="{ active: selectedListing?.id === listing.id }"
                shadow="never"
                @click="selectListing(listing)"
              >
                <div class="listing-card-header">
                  <strong>{{ listing.title }}</strong>
                  <el-tag :type="statusType(listing.status)" size="small">{{ statusLabels[listing.status] }}</el-tag>
                </div>
                <small>{{ listing.address }}</small>
                <b>{{ formatCurrency(listing.rentPrice) }}</b>
              </el-card>
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

      <div
        class="map-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整地图和列表宽度"
        @pointerdown="startPanelResize"
        @pointermove="resizePanel"
        @pointerup="stopPanelResize"
        @pointercancel="stopPanelResize"
      />

      <div class="map-canvas-panel">
        <AmapListingMap
          :listings="mappedListings"
          :locations="locations"
          :selected-listing-id="selectedListing?.id"
          @bounds-change="applyMapBounds"
          @select-listing="selectListing"
        />
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
