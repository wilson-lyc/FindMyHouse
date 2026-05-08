import { deleteData, getData, patchData, postData } from '../http';
import type { House, HouseFilters, HouseForm } from '../../model/house/house';

export async function fetchHouses(filters: HouseFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.sourceChannel) params.set('sourceChannel', filters.sourceChannel);
  if (filters.minLatitude !== undefined) params.set('minLatitude', String(filters.minLatitude));
  if (filters.maxLatitude !== undefined) params.set('maxLatitude', String(filters.maxLatitude));
  if (filters.minLongitude !== undefined) params.set('minLongitude', String(filters.minLongitude));
  if (filters.maxLongitude !== undefined) params.set('maxLongitude', String(filters.maxLongitude));

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return getData<House[]>(`/api/houses${suffix}`);
}

export function createHouse(payload: HouseForm) {
  return postData<House, HouseForm>('/api/houses', payload);
}

export function updateHouse(id: string, payload: HouseForm) {
  return patchData<House, HouseForm>(`/api/houses/${id}`, payload);
}

export function deleteHouse(id: string) {
  return deleteData(`/api/houses/${id}`);
}
