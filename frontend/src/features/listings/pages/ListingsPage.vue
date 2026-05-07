<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
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

onMounted(loadListings);
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
    <ListingTable :listings="listings" :loading="loading" @edit="openEditDialog" @delete="confirmDelete" />
    <ListingFormDialog v-model="dialogVisible" :listing="editingListing" :saving="saving" @submit="submitListing" />
  </main>
</template>
