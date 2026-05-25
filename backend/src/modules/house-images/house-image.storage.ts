import { resolve } from 'node:path';

export const uploadsRoot = resolve(process.cwd(), 'data/uploads');
export const houseImageUploadsRoot = resolve(uploadsRoot, 'house-images');
export const uploadsUrlPrefix = '/uploads';

export function toHouseImageUrl(houseId: string, fileName: string): string {
  return `${uploadsUrlPrefix}/house-images/${houseId}/${fileName}`;
}
