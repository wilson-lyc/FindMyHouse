import type { Listing, ListingForm } from '../model/listing';

export function createEmptyListingForm(): ListingForm {
  return {
    title: '',
    source: '',
    sourceUrl: '',
    address: '',
    latitude: undefined,
    longitude: undefined,
    rentPrice: 0,
    depositAmount: undefined,
    agencyFee: undefined,
    areaSqm: undefined,
    layout: '',
    floor: '',
    orientation: '',
    availableDate: '',
    status: 'new',
    notes: ''
  };
}

export function listingToForm(listing: Listing): ListingForm {
  return {
    title: listing.title,
    source: listing.source ?? '',
    sourceUrl: listing.sourceUrl ?? '',
    address: listing.address,
    latitude: listing.latitude,
    longitude: listing.longitude,
    rentPrice: listing.rentPrice,
    depositAmount: listing.depositAmount,
    agencyFee: listing.agencyFee,
    areaSqm: listing.areaSqm,
    layout: listing.layout ?? '',
    floor: listing.floor ?? '',
    orientation: listing.orientation ?? '',
    availableDate: listing.availableDate ?? '',
    status: listing.status,
    notes: listing.notes ?? ''
  };
}

export function normalizeListingForm(payload: ListingForm): ListingForm {
  return {
    ...payload,
    source: payload.source?.trim() || undefined,
    sourceUrl: payload.sourceUrl?.trim() || undefined,
    layout: payload.layout?.trim() || undefined,
    floor: payload.floor?.trim() || undefined,
    orientation: payload.orientation?.trim() || undefined,
    availableDate: payload.availableDate || undefined,
    notes: payload.notes?.trim() || undefined,
    latitude: payload.latitude ?? undefined,
    longitude: payload.longitude ?? undefined,
    depositAmount: payload.depositAmount ?? undefined,
    agencyFee: payload.agencyFee ?? undefined,
    areaSqm: payload.areaSqm ?? undefined
  };
}
