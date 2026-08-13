import type { HouseImage } from '@findmyhouse/contracts';

export interface HouseImageRow {
  id: string;
  house_id: string;
  url: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  is_cover: number;
  created_at: string;
  updated_at: string;
}

export function toHouseImage(row: HouseImageRow): HouseImage {
  return {
    id: row.id,
    houseId: row.house_id,
    url: row.url,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    sortOrder: row.sort_order,
    isCover: row.is_cover === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
