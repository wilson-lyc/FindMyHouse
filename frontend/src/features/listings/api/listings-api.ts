import { deleteData, getData, patchData, postData } from '../../../shared/api/http';
import type { Listing, ListingFilters, ListingForm } from '../model/listing';

export async function fetchListings(filters: ListingFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return getData<Listing[]>(`/api/listings${suffix}`);
}

export function createListing(payload: ListingForm) {
  return postData<Listing, ListingForm>('/api/listings', payload);
}

export function updateListing(id: string, payload: ListingForm) {
  return patchData<Listing, ListingForm>(`/api/listings/${id}`, payload);
}

export function deleteListing(id: string) {
  return deleteData(`/api/listings/${id}`);
}
