import { listingPaymentPeriods, type Listing, type ListingPaymentPeriod, type ListingStatus } from './domain/listing.js';
import type { CreateListingInput, UpdateListingInput } from './dto/listing.schema.js';

export interface ListingRow {
  id: string;
  title: string;
  source: string | null;
  source_url: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rent_price: number;
  payment_periods: string | null;
  deposit_amount: number | null;
  agency_fee: number | null;
  property_fee: number | null;
  water_fee_per_ton: number | null;
  electricity_fee_per_kwh: number | null;
  internet_fee: number | null;
  shared_fee: number | null;
  other_fee: number | null;
  area_sqm: number | null;
  layout: string | null;
  floor: string | null;
  orientation: string | null;
  available_date: string | null;
  status: ListingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function toListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    source: row.source ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    address: row.address,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    rentPrice: row.rent_price,
    paymentPeriods: parsePaymentPeriods(row.payment_periods),
    depositAmount: row.deposit_amount ?? undefined,
    agencyFee: row.agency_fee ?? undefined,
    propertyFee: row.property_fee ?? undefined,
    waterFeePerTon: row.water_fee_per_ton ?? undefined,
    electricityFeePerKwh: row.electricity_fee_per_kwh ?? undefined,
    internetFee: row.internet_fee ?? undefined,
    sharedFee: row.shared_fee ?? undefined,
    otherFee: row.other_fee ?? undefined,
    areaSqm: row.area_sqm ?? undefined,
    layout: row.layout ?? undefined,
    floor: row.floor ?? undefined,
    orientation: row.orientation ?? undefined,
    availableDate: row.available_date ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toListingRowParams(input: CreateListingInput | UpdateListingInput) {
  return {
    title: input.title ?? null,
    source: input.source ?? null,
    source_url: input.sourceUrl ?? null,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    rent_price: input.rentPrice ?? null,
    payment_periods: input.paymentPeriods?.length ? JSON.stringify(input.paymentPeriods) : null,
    deposit_amount: input.depositAmount ?? null,
    agency_fee: input.agencyFee ?? null,
    property_fee: input.propertyFee ?? null,
    water_fee_per_ton: input.waterFeePerTon ?? null,
    electricity_fee_per_kwh: input.electricityFeePerKwh ?? null,
    internet_fee: input.internetFee ?? null,
    shared_fee: input.sharedFee ?? null,
    other_fee: input.otherFee ?? null,
    area_sqm: input.areaSqm ?? null,
    layout: input.layout ?? null,
    floor: input.floor ?? null,
    orientation: input.orientation ?? null,
    available_date: input.availableDate ?? null,
    status: input.status ?? null,
    notes: input.notes ?? null
  };
}

function parsePaymentPeriods(value: string | null): ListingPaymentPeriod[] | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;

    const periods = parsed.filter((item): item is ListingPaymentPeriod =>
      listingPaymentPeriods.includes(item as ListingPaymentPeriod)
    );

    return periods.length ? periods : undefined;
  } catch {
    return undefined;
  }
}
