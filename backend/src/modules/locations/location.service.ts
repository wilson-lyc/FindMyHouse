import type { Location, LocationFilters } from './domain/location.js';
import type { CreateLocationInput, UpdateLocationInput } from './dto/location.schema.js';
import type { LocationRepository } from './location.repository.js';

export class LocationService {
  constructor(private readonly repository: LocationRepository) {}

  listLocations(filters: LocationFilters): Location[] {
    return this.repository.list(filters);
  }

  getLocation(id: string): Location | undefined {
    return this.repository.findById(id);
  }

  createLocation(input: CreateLocationInput): Location {
    return this.repository.create(input);
  }

  updateLocation(id: string, input: UpdateLocationInput): Location | undefined {
    return this.repository.update(id, input);
  }

  deleteLocation(id: string): boolean {
    return this.repository.delete(id);
  }
}
