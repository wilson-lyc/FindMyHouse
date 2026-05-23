import type { CustomFeeItem, House, HouseForm } from '../../model/house/house';

export function createEmptyHouseForm(): HouseForm {
  return {
    name: '',
    status: 'watching',
    bedroomCount: 1,
    livingRoomCount: 1,
    bathroomCount: 1,
    sourceChannel: undefined,
    address: '',
    latitude: undefined,
    longitude: undefined,
    rentPrice: undefined,
    rentPaymentPeriods: [],
    earnestMoney: undefined,
    deposit: undefined,
    propertyFee: undefined,
    waterFeePerTon: undefined,
    electricityFeePerKwh: undefined,
    customFees: [],
    feeNotes: '',
    phone: '',
    wechat: '',
    contactNotes: ''
  };
}

export function houseToForm(house: House): HouseForm {
  return {
    name: house.name,
    status: house.status,
    bedroomCount: house.bedroomCount,
    livingRoomCount: house.livingRoomCount,
    bathroomCount: house.bathroomCount,
    sourceChannel: house.sourceChannel,
    address: house.address,
    latitude: house.latitude,
    longitude: house.longitude,
    rentPrice: house.rentPrice,
    rentPaymentPeriods: house.rentPaymentPeriods ?? [],
    earnestMoney: house.earnestMoney,
    deposit: house.deposit,
    propertyFee: house.propertyFee,
    waterFeePerTon: house.waterFeePerTon,
    electricityFeePerKwh: house.electricityFeePerKwh,
    customFees: house.customFees ?? [],
    feeNotes: house.feeNotes ?? '',
    phone: house.phone ?? '',
    wechat: house.wechat ?? '',
    contactNotes: house.contactNotes ?? ''
  };
}

export function normalizeHouseForm(payload: HouseForm): HouseForm {
  return {
    ...payload,
    name: payload.name.trim(),
    sourceChannel: payload.sourceChannel || null,
    phone: payload.phone?.trim() ?? '',
    wechat: payload.wechat?.trim() ?? '',
    contactNotes: payload.contactNotes?.trim() ?? '',
    latitude: payload.latitude ?? undefined,
    longitude: payload.longitude ?? undefined,
    rentPaymentPeriods: payload.rentPaymentPeriods?.length ? payload.rentPaymentPeriods : undefined,
    earnestMoney: payload.earnestMoney ?? undefined,
    deposit: payload.deposit ?? undefined,
    propertyFee: payload.propertyFee ?? undefined,
    waterFeePerTon: payload.waterFeePerTon ?? undefined,
    electricityFeePerKwh: payload.electricityFeePerKwh ?? undefined,
    customFees: payload.customFees?.length ? payload.customFees : undefined,
    feeNotes: payload.feeNotes?.trim() ?? ''
  };
}
