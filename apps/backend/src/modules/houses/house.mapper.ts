import {
  rentPaymentPeriods,
  type CustomFeeItem,
  type House,
  type HouseImageItem,
  type HouseSourceChannel,
  type HouseStatus,
  type RentPaymentPeriod,
  type ViewingScheduleItem
} from './domain/house.js';
import type { CreateHouseInput, ImportHouseInput, UpdateHouseInput } from './dto/house.schema.js';

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
  earnest_money: number | null;
  deposit: number | null;
  property_fee: number | null;
  water_fee_per_ton: number | null;
  electricity_fee_per_kwh: number | null;
  custom_fees: string | null;
  fee_notes: string | null;
  contact_name: string | null;
  phone: string | null;
  wechat: string | null;
  contact_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViewingScheduleRow {
  id: string;
  house_id: string;
  viewing_at: string;
  note: string | null;
  house_name?: string;
  created_at: string;
  updated_at: string;
}

export function toHouse(row: HouseRow, viewingSchedules?: ViewingScheduleItem[], images?: HouseImageItem[]): House {
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
    earnestMoney: row.earnest_money ?? undefined,
    deposit: row.deposit ?? undefined,
    propertyFee: row.property_fee ?? undefined,
    waterFeePerTon: row.water_fee_per_ton ?? undefined,
    electricityFeePerKwh: row.electricity_fee_per_kwh ?? undefined,
    customFees: parseCustomFees(row.custom_fees),
    viewingSchedules: viewingSchedules?.length ? viewingSchedules : undefined,
    images: images?.length ? images : undefined,
    feeNotes: row.fee_notes ?? undefined,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
    wechat: row.wechat ?? undefined,
    contactNotes: row.contact_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toViewingSchedule(row: ViewingScheduleRow): ViewingScheduleItem {
  return {
    id: row.id,
    houseId: row.house_id,
    viewingAt: row.viewing_at,
    note: row.note ?? undefined,
    houseName: row.house_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toHouseRowParams(input: CreateHouseInput | UpdateHouseInput | ImportHouseInput | House) {
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
    earnest_money: input.earnestMoney ?? null,
    deposit: input.deposit ?? null,
    property_fee: input.propertyFee ?? null,
    water_fee_per_ton: input.waterFeePerTon ?? null,
    electricity_fee_per_kwh: input.electricityFeePerKwh ?? null,
    custom_fees: input.customFees?.length ? JSON.stringify(input.customFees) : null,
    fee_notes: input.feeNotes ?? null,
    contact_name: input.contactName ?? null,
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

function parseCustomFees(value: string | null): CustomFeeItem[] | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return undefined;

    const fees = parsed.filter(
      (item): item is CustomFeeItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        typeof (item as Record<string, unknown>).amount === 'number'
    );

    return fees.length ? fees : undefined;
  } catch {
    return undefined;
  }
}
