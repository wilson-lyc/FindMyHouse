import type { Location, LocationForm } from '../model/location';

export function createEmptyLocationForm(): LocationForm {
  return {
    name: '',
    category: 'work',
    address: '',
    latitude: undefined,
    longitude: undefined,
    notes: ''
  };
}

export function locationToForm(location: Location): LocationForm {
  return {
    name: location.name,
    category: location.category,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    notes: location.notes ?? ''
  };
}

export function normalizeLocationForm(payload: LocationForm): LocationForm {
  return {
    ...payload,
    name: payload.name.trim(),
    address: payload.address.trim(),
    latitude: payload.latitude ?? undefined,
    longitude: payload.longitude ?? undefined,
    notes: payload.notes?.trim() || undefined
  };
}
