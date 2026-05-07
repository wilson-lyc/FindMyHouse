import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createListing, deleteListing, fetchListings, updateListing } from '../api/listings-api';
import type { Listing, ListingFilters, ListingForm } from '../model/listing';

export function useListings() {
  const listings = ref<Listing[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const filters = reactive<ListingFilters>({
    q: '',
    status: ''
  });

  const averageRent = computed(() => {
    if (!listings.value.length) return 0;
    const totalRent = listings.value.reduce((sum, listing) => sum + listing.rentPrice, 0);
    return Math.round(totalRent / listings.value.length);
  });

  const shortlistedCount = computed(() => listings.value.filter((listing) => listing.status === 'shortlisted').length);

  async function loadListings() {
    loading.value = true;
    try {
      listings.value = await fetchListings(filters);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '加载房源失败');
    } finally {
      loading.value = false;
    }
  }

  async function saveListing(payload: ListingForm, editingListing?: Listing | null) {
    saving.value = true;
    try {
      if (editingListing) {
        await updateListing(editingListing.id, payload);
        ElMessage.success('房源已更新');
      } else {
        await createListing(payload);
        ElMessage.success('房源已创建');
      }

      await loadListings();
    } finally {
      saving.value = false;
    }
  }

  async function removeListing(listing: Listing) {
    await deleteListing(listing.id);
    ElMessage.success('房源已删除');
    await loadListings();
  }

  return {
    listings,
    loading,
    saving,
    filters,
    averageRent,
    shortlistedCount,
    loadListings,
    saveListing,
    removeListing
  };
}
