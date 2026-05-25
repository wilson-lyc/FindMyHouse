export interface HouseImage {
  id: string;
  houseId: string;
  url: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  sortOrder: number;
  isCover: boolean;
  createdAt: string;
  updatedAt: string;
}
