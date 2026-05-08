import type { Listing, ListingFilters } from './domain/listing.js';
import type { CreateListingInput, UpdateListingInput } from './dto/listing.schema.js';
import type { ListingRepository } from './listing.repository.js';

export class ListingService {
  constructor(private readonly repository: ListingRepository) {}

  listListings(filters: ListingFilters): Listing[] {
    return this.repository.list(filters);
  }

  getListing(id: string): Listing | undefined {
    return this.repository.findById(id);
  }

  createListing(input: CreateListingInput): Listing {
    return this.repository.create(input);
  }

  updateListing(id: string, input: UpdateListingInput): Listing | undefined {
    return this.repository.update(id, input);
  }

  deleteListing(id: string): boolean {
    return this.repository.delete(id);
  }

  toggleFavorite(id: string, isFavorited: boolean): Listing | undefined {
    return this.repository.toggleFavorite(id, isFavorited);
  }
}
