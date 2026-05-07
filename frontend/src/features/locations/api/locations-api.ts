import { deleteData, getData, patchData, postData } from '../../../shared/api/http';
import type { Location, LocationFilters, LocationForm } from '../model/location';

export async function fetchLocations(filters: LocationFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return getData<Location[]>(`/api/locations${suffix}`);
}

export function createLocation(payload: LocationForm) {
  return postData<Location, LocationForm>('/api/locations', payload);
}

export function updateLocation(id: string, payload: LocationForm) {
  return patchData<Location, LocationForm>(`/api/locations/${id}`, payload);
}

export function deleteLocation(id: string) {
  return deleteData(`/api/locations/${id}`);
}
