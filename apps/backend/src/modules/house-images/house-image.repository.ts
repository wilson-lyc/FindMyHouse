import { randomUUID } from 'node:crypto';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { HouseImage } from './domain/house-image.js';
import { toHouseImage, type HouseImageRow } from './house-image.mapper.js';

export interface CreateHouseImageInput {
  houseId: string;
  url: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

export class HouseImageRepository {
  constructor(private readonly database: DatabaseType) {}

  listByHouseId(houseId: string): HouseImage[] {
    const rows = this.database
      .prepare('SELECT * FROM house_images WHERE house_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(houseId) as HouseImageRow[];

    return rows.map(toHouseImage);
  }

  findById(id: string): HouseImage | undefined {
    const row = this.database.prepare('SELECT * FROM house_images WHERE id = ?').get(id) as HouseImageRow | undefined;
    return row ? toHouseImage(row) : undefined;
  }

  createMany(inputs: CreateHouseImageInput[]): HouseImage[] {
    if (!inputs.length) {
      return [];
    }

    const now = new Date().toISOString();
    const initialMaxSortOrder = this.getMaxSortOrder(inputs[0].houseId);
    const shouldSetFirstAsCover = !this.hasCover(inputs[0].houseId);

    const insert = this.database.prepare(`
      INSERT INTO house_images (
        id, house_id, url, storage_path, original_name, mime_type, size, width, height, sort_order, is_cover, created_at, updated_at
      ) VALUES (
        @id, @house_id, @url, @storage_path, @original_name, @mime_type, @size, @width, @height, @sort_order, @is_cover, @created_at, @updated_at
      )
    `);

    const ids = inputs.map(() => randomUUID());
    const transaction = this.database.transaction((items: CreateHouseImageInput[]) => {
      items.forEach((input, index) => {
        insert.run({
          id: ids[index],
          house_id: input.houseId,
          url: input.url,
          storage_path: input.storagePath,
          original_name: input.originalName,
          mime_type: input.mimeType,
          size: input.size,
          width: input.width ?? null,
          height: input.height ?? null,
          sort_order: initialMaxSortOrder + index + 1,
          is_cover: shouldSetFirstAsCover && index === 0 ? 1 : 0,
          created_at: now,
          updated_at: now
        });
      });
    });

    transaction(inputs);

    return ids.map((id) => this.findById(id)).filter((image): image is HouseImage => Boolean(image));
  }

  delete(id: string): HouseImage | undefined {
    const current = this.findById(id);
    if (!current) {
      return undefined;
    }

    const transaction = this.database.transaction(() => {
      this.database.prepare('DELETE FROM house_images WHERE id = ?').run(id);

      if (current.isCover) {
        const nextCover = this.database
          .prepare('SELECT id FROM house_images WHERE house_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1')
          .get(current.houseId) as { id: string } | undefined;

        if (nextCover) {
          this.setCover(nextCover.id);
        }
      }
    });

    transaction();
    return current;
  }

  setCover(id: string): HouseImage | undefined {
    const current = this.findById(id);
    if (!current) {
      return undefined;
    }

    const now = new Date().toISOString();
    const transaction = this.database.transaction(() => {
      this.database.prepare('UPDATE house_images SET is_cover = 0, updated_at = ? WHERE house_id = ?').run(now, current.houseId);
      this.database.prepare('UPDATE house_images SET is_cover = 1, updated_at = ? WHERE id = ?').run(now, id);
    });

    transaction();
    return this.findById(id);
  }

  updateSortOrder(id: string, sortOrder: number): HouseImage | undefined {
    const current = this.findById(id);
    if (!current) {
      return undefined;
    }

    this.database
      .prepare('UPDATE house_images SET sort_order = @sort_order, updated_at = @updated_at WHERE id = @id')
      .run({ id, sort_order: sortOrder, updated_at: new Date().toISOString() });

    return this.findById(id);
  }

  reorder(houseId: string, imageIds: string[]): HouseImage[] | undefined {
    const existing = this.listByHouseId(houseId);
    const existingIds = new Set(existing.map((image) => image.id));
    if (existing.length !== imageIds.length || imageIds.some((id) => !existingIds.has(id))) {
      return undefined;
    }

    const now = new Date().toISOString();
    const update = this.database.prepare('UPDATE house_images SET sort_order = @sort_order, updated_at = @updated_at WHERE id = @id');
    const transaction = this.database.transaction((ids: string[]) => {
      ids.forEach((id, index) => update.run({ id, sort_order: index + 1, updated_at: now }));
    });

    transaction(imageIds);
    return this.listByHouseId(houseId);
  }

  houseExists(houseId: string): boolean {
    const row = this.database.prepare('SELECT 1 FROM houses WHERE id = ?').get(houseId);
    return Boolean(row);
  }

  private getMaxSortOrder(houseId: string): number {
    const row = this.database.prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order FROM house_images WHERE house_id = ?').get(houseId) as
      | { max_sort_order: number }
      | undefined;
    return row?.max_sort_order ?? 0;
  }

  private hasCover(houseId: string): boolean {
    const row = this.database.prepare('SELECT 1 FROM house_images WHERE house_id = ? AND is_cover = 1 LIMIT 1').get(houseId);
    return Boolean(row);
  }
}
