import type { House, HouseFilters } from '@findmyhouse/contracts';
import type { CreateHouseInput, ImportHouseInput, UpdateHouseInput } from '@findmyhouse/contracts';
import type { HouseRepository } from './house.repository.js';

export class HouseService {
  constructor(private readonly repository: HouseRepository) {}

  listHouses(filters: HouseFilters): House[] {
    return this.repository.list(filters);
  }

  getHouse(id: string): House | undefined {
    return this.repository.findById(id);
  }

  createHouse(input: CreateHouseInput): House {
    return this.repository.create(input);
  }

  updateHouse(id: string, input: UpdateHouseInput): House | undefined {
    return this.repository.update(id, input);
  }

  deleteHouse(id: string): boolean {
    return this.repository.delete(id);
  }

  importHouses(houses: ImportHouseInput[]): number {
    return this.repository.upsertMany(houses);
  }
}
