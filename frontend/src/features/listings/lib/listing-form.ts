import type { Listing, ListingForm } from '../model/listing';

export function createEmptyListingForm(): ListingForm {
  return {
    title: '',
    source: '',
    sourceUrl: '',
    address: '',
    latitude: undefined,
    longitude: undefined,
    rentPrice: undefined,
    paymentPeriods: [],
    depositAmount: undefined,
    agencyFee: undefined,
    propertyFee: undefined,
    waterFeePerTon: undefined,
    electricityFeePerKwh: undefined,
    internetFee: undefined,
    sharedFee: undefined,
    otherFee: undefined,
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
    paymentPeriods: listing.paymentPeriods ?? [],
    depositAmount: listing.depositAmount,
    agencyFee: listing.agencyFee,
    propertyFee: listing.propertyFee,
    waterFeePerTon: listing.waterFeePerTon,
    electricityFeePerKwh: listing.electricityFeePerKwh,
    internetFee: listing.internetFee,
    sharedFee: listing.sharedFee,
    otherFee: listing.otherFee,
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
    paymentPeriods: payload.paymentPeriods?.length ? payload.paymentPeriods : undefined,
    depositAmount: payload.depositAmount ?? undefined,
    agencyFee: payload.agencyFee ?? undefined,
    propertyFee: payload.propertyFee ?? undefined,
    waterFeePerTon: payload.waterFeePerTon ?? undefined,
    electricityFeePerKwh: payload.electricityFeePerKwh ?? undefined,
    internetFee: payload.internetFee ?? undefined,
    sharedFee: payload.sharedFee ?? undefined,
    otherFee: payload.otherFee ?? undefined,
    areaSqm: payload.areaSqm ?? undefined
  };
}
