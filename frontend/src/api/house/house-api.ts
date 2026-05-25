import { deleteData, getData, patchData, postData, postFormData, putData } from '../http';
import type { House, HouseFilters, HouseForm, HouseImage } from '../../model/house/house';

export async function fetchHouses(filters: HouseFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.sourceChannel) params.set('sourceChannel', filters.sourceChannel);
  if (filters.minRentPrice !== undefined) params.set('minRentPrice', String(filters.minRentPrice));
  if (filters.maxRentPrice !== undefined) params.set('maxRentPrice', String(filters.maxRentPrice));
  if (filters.minBedroomCount !== undefined) params.set('minBedroomCount', String(filters.minBedroomCount));
  if (filters.maxBedroomCount !== undefined) params.set('maxBedroomCount', String(filters.maxBedroomCount));
  if (filters.minLivingRoomCount !== undefined) params.set('minLivingRoomCount', String(filters.minLivingRoomCount));
  if (filters.maxLivingRoomCount !== undefined) params.set('maxLivingRoomCount', String(filters.maxLivingRoomCount));
  if (filters.minBathroomCount !== undefined) params.set('minBathroomCount', String(filters.minBathroomCount));
  if (filters.maxBathroomCount !== undefined) params.set('maxBathroomCount', String(filters.maxBathroomCount));
  if (filters.minLatitude !== undefined) params.set('minLatitude', String(filters.minLatitude));
  if (filters.maxLatitude !== undefined) params.set('maxLatitude', String(filters.maxLatitude));
  if (filters.minLongitude !== undefined) params.set('minLongitude', String(filters.minLongitude));
  if (filters.maxLongitude !== undefined) params.set('maxLongitude', String(filters.maxLongitude));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));

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

export function fetchHouseImages(houseId: string) {
  return getData<HouseImage[]>(`/api/houses/${houseId}/images`);
}

export function uploadHouseImages(houseId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  return postFormData<HouseImage[]>(`/api/houses/${houseId}/images`, formData);
}

export function deleteHouseImage(houseId: string, imageId: string) {
  return deleteData(`/api/houses/${houseId}/images/${imageId}`);
}

export function updateHouseImage(
  houseId: string,
  imageId: string,
  payload: Partial<Pick<HouseImage, 'isCover' | 'sortOrder'>>
) {
  return patchData<HouseImage, Partial<Pick<HouseImage, 'isCover' | 'sortOrder'>>>(
    `/api/houses/${houseId}/images/${imageId}`,
    payload
  );
}

export function reorderHouseImages(houseId: string, imageIds: string[]) {
  return putData<HouseImage[], { imageIds: string[] }>(`/api/houses/${houseId}/images/order`, { imageIds });
}
