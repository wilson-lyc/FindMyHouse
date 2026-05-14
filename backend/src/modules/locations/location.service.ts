import type { Location, LocationFilters } from './domain/location.js';
import type { CreateLocationInput, UpdateLocationInput } from './dto/location.schema.js';
import type { LocationRepository } from './location.repository.js';
import type { RouteCacheRepository } from '../maps/route-cache.repository.js';

export class LocationService {
  constructor(
    private readonly repository: LocationRepository,
    private readonly routeCacheRepository?: RouteCacheRepository
  ) {}

  listLocations(filters: LocationFilters): Location[] {
    return this.repository.list(filters);
  }

  getLocation(id: string): Location | undefined {
    return this.repository.findById(id);
  }

  createLocation(input: CreateLocationInput): Location {
    const previousFocus = this.getFocusSignature();
    const location = this.repository.create(input);
    this.clearRouteCacheIfFocusChanged(previousFocus);
    return location;
  }

  updateLocation(id: string, input: UpdateLocationInput): Location | undefined {
    const previousFocus = this.getFocusSignature();
    const location = this.repository.update(id, input);
    this.clearRouteCacheIfFocusChanged(previousFocus);
    return location;
  }

  setFocusLocation(id: string): Location | undefined {
    return this.updateLocation(id, { isFocus: true });
  }

  deleteLocation(id: string): boolean {
    const previousFocus = this.getFocusSignature();
    const deleted = this.repository.delete(id);
    if (deleted) {
      this.clearRouteCacheIfFocusChanged(previousFocus);
    }
    return deleted;
  }

  private getFocusSignature(): string {
    const focus = this.repository.list().find((location) => location.isFocus);
    if (!focus) return '';

    return [focus.id, focus.longitude ?? '', focus.latitude ?? ''].join(':');
  }

  private clearRouteCacheIfFocusChanged(previousFocus: string) {
    if (!this.routeCacheRepository) return;

    if (previousFocus !== this.getFocusSignature()) {
      this.routeCacheRepository.clearAll();
    }
  }
}
