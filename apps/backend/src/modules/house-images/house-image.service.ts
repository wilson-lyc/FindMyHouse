import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp';
import type { HouseImage } from '@findmyhouse/contracts';
import type { HouseImageRepository } from './house-image.repository.js';
import { houseImageUploadsRoot, toHouseImageUrl } from './house-image.storage.js';

const imageMimeExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif'
};

export class HouseImageService {
  constructor(private readonly repository: HouseImageRepository) {}

  listHouseImages(houseId: string): HouseImage[] | undefined {
    if (!this.repository.houseExists(houseId)) {
      return undefined;
    }

    return this.repository.listByHouseId(houseId);
  }

  async uploadHouseImages(houseId: string, files: AsyncIterable<MultipartFile>): Promise<HouseImage[] | undefined> {
    if (!this.repository.houseExists(houseId)) {
      await this.discardFiles(files);
      return undefined;
    }

    const savedFiles: Array<{
      url: string;
      storagePath: string;
      originalName: string;
      mimeType: string;
      size: number;
      width?: number;
      height?: number;
    }> = [];

    try {
      const houseDirectory = resolve(houseImageUploadsRoot, houseId);
      await mkdir(houseDirectory, { recursive: true });

      for await (const file of files) {
        if (!this.isSupportedImage(file)) {
          file.file.resume();
          throw new UnsupportedHouseImageError();
        }

        const extension = this.getFileExtension(file);
        const fileName = `${randomUUID()}${extension}`;
        const storagePath = resolve(houseDirectory, fileName);
        const output = createWriteStream(storagePath);
        await pipeline(file.file, output);
        const size = output.bytesWritten;
        const metadata = await sharp(storagePath).metadata();

        savedFiles.push({
          url: toHouseImageUrl(houseId, fileName),
          storagePath,
          originalName: basename(file.filename),
          mimeType: file.mimetype,
          size,
          width: metadata.width,
          height: metadata.height
        });
      }

      if (!savedFiles.length) {
        throw new NoHouseImagesUploadedError();
      }

      return this.repository.createMany(savedFiles.map((file) => ({ houseId, ...file })));
    } catch (error) {
      await Promise.allSettled(savedFiles.map((file) => unlink(file.storagePath)));
      throw error;
    }
  }

  async deleteImage(houseId: string, id: string): Promise<HouseImage | undefined> {
    const current = this.repository.findById(id);
    if (!current || current.houseId !== houseId) {
      return undefined;
    }

    const image = this.repository.delete(id);
    if (!image) {
      return undefined;
    }

    await unlink(image.storagePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });

    return image;
  }

  updateImage(houseId: string, id: string, input: { isCover?: boolean; sortOrder?: number }): HouseImage | undefined {
    const current = this.repository.findById(id);
    if (!current || current.houseId !== houseId) {
      return undefined;
    }

    if (input.isCover) {
      return this.repository.setCover(id);
    }

    if (input.sortOrder !== undefined) {
      return this.repository.updateSortOrder(id, input.sortOrder);
    }

    return current;
  }

  setCover(id: string): HouseImage | undefined {
    return this.repository.setCover(id);
  }

  reorderHouseImages(houseId: string, imageIds: string[]): HouseImage[] | undefined {
    if (!this.repository.houseExists(houseId)) {
      return undefined;
    }

    return this.repository.reorder(houseId, imageIds);
  }

  isSupportedImage(file: MultipartFile): boolean {
    return file.fieldname === 'images' && Object.hasOwn(imageMimeExtensions, file.mimetype);
  }

  private async discardFiles(files: AsyncIterable<MultipartFile>) {
    for await (const file of files) {
      file.file.resume();
    }
  }

  private getFileExtension(file: MultipartFile): string {
    const safeExtension = extname(file.filename).toLowerCase();
    return safeExtension || imageMimeExtensions[file.mimetype] || '';
  }
}

export class UnsupportedHouseImageError extends Error {
  constructor() {
    super('Only image files in the images field are supported');
  }
}

export class NoHouseImagesUploadedError extends Error {
  constructor() {
    super('At least one image is required');
  }
}
