import { rentPaymentPeriods, type House, type HouseSourceChannel, type HouseStatus, type RentPaymentPeriod } from './domain/house.js';
import type { CreateHouseInput, UpdateHouseInput } from './dto/house.schema.js';

export interface HouseRow {
  id: string;
  name: string;
  status: HouseStatus;
  bedroom_count: number;
  living_room_count: number;
  bathroom_count: number;
  source_channel: HouseSourceChannel | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rent_price: number;
  rent_payment_periods: string | null;
  property_fee: number | null;
  water_fee_per_ton: number | null;
  electricity_fee_per_kwh: number | null;
  other_fee: number | null;
  phone: string | null;
  wechat: string | null;
  contact_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function toHouse(row: HouseRow): House {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    bedroomCount: row.bedroom_count,
    livingRoomCount: row.living_room_count,
    bathroomCount: row.bathroom_count,
    sourceChannel: row.source_channel ?? undefined,
    address: row.address,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    rentPrice: row.rent_price,
    rentPaymentPeriods: parseRentPaymentPeriods(row.rent_payment_periods),
    propertyFee: row.property_fee ?? undefined,
    waterFeePerTon: row.water_fee_per_ton ?? undefined,
    electricityFeePerKwh: row.electricity_fee_per_kwh ?? undefined,
    otherFee: row.other_fee ?? undefined,
    phone: row.phone ?? undefined,
    wechat: row.wechat ?? undefined,
    contactNotes: row.contact_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toHouseRowParams(input: CreateHouseInput | UpdateHouseInput) {
  return {
    name: input.name ?? null,
    status: input.status ?? null,
    bedroom_count: input.bedroomCount ?? null,
    living_room_count: input.livingRoomCount ?? null,
    bathroom_count: input.bathroomCount ?? null,
    source_channel: input.sourceChannel ?? null,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    rent_price: input.rentPrice ?? null,
    rent_payment_periods: input.rentPaymentPeriods?.length ? JSON.stringify(input.rentPaymentPeriods) : null,
    property_fee: input.propertyFee ?? null,
    water_fee_per_ton: input.waterFeePerTon ?? null,
    electricity_fee_per_kwh: input.electricityFeePerKwh ?? null,
    other_fee: input.otherFee ?? null,
    phone: input.phone ?? null,
    wechat: input.wechat ?? null,
    contact_notes: input.contactNotes ?? null
  };
}

function parseRentPaymentPeriods(value: string | null): RentPaymentPeriod[] | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;

    const periods = parsed.filter((item): item is RentPaymentPeriod =>
      rentPaymentPeriods.includes(item as RentPaymentPeriod)
    );

    return periods.length ? periods : undefined;
  } catch {
    return undefined;
  }
}
