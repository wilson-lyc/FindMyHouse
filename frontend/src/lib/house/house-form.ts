import type { House, HouseForm } from '../../model/house/house';

export function createEmptyHouseForm(): HouseForm {
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

export function houseToForm(house: House): HouseForm {
  return {
    title: house.title,
    source: house.source ?? '',
    sourceUrl: house.sourceUrl ?? '',
    address: house.address,
    latitude: house.latitude,
    longitude: house.longitude,
    rentPrice: house.rentPrice,
    paymentPeriods: house.paymentPeriods ?? [],
    depositAmount: house.depositAmount,
    agencyFee: house.agencyFee,
    propertyFee: house.propertyFee,
    waterFeePerTon: house.waterFeePerTon,
    electricityFeePerKwh: house.electricityFeePerKwh,
    internetFee: house.internetFee,
    sharedFee: house.sharedFee,
    otherFee: house.otherFee,
    areaSqm: house.areaSqm,
    layout: house.layout ?? '',
    floor: house.floor ?? '',
    orientation: house.orientation ?? '',
    availableDate: house.availableDate ?? '',
    status: house.status,
    notes: house.notes ?? ''
  };
}

export function normalizeHouseForm(payload: HouseForm): HouseForm {
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
