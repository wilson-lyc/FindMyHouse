import type { Location, LocationCategory } from './domain/location.js';
import type { CreateLocationInput, UpdateLocationInput } from './dto/location.schema.js';

export interface LocationRow {
  id: string;
  name: string;
  category: LocationCategory;
  address: string;
  latitude: number | null;
  longitude: number | null;
  is_focus: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function toLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    address: row.address,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    isFocus: Boolean(row.is_focus),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toLocationRowParams(input: CreateLocationInput | UpdateLocationInput) {
  return {
    name: input.name ?? null,
    category: input.category ?? null,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    is_focus: input.isFocus ? 1 : 0,
    notes: input.notes ?? null
  };
}
