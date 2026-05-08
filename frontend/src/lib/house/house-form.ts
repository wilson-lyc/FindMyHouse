import type { House, HouseForm } from '../../model/house/house';

export function createEmptyHouseForm(): HouseForm {
  return {
    name: '',
    status: 'watching',
    bedroomCount: 1,
    livingRoomCount: 1,
    bathroomCount: 1,
    sourceChannel: undefined,
    sourceChannelName: '',
    address: '',
    latitude: undefined,
    longitude: undefined,
    rentPrice: undefined,
    propertyFee: undefined,
    waterFeePerTon: undefined,
    electricityFeePerKwh: undefined,
    otherFee: undefined,
    phone: '',
    wechat: ''
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
    sourceChannelName: house.sourceChannelName ?? '',
    address: house.address,
    latitude: house.latitude,
    longitude: house.longitude,
    rentPrice: house.rentPrice,
    propertyFee: house.propertyFee,
    waterFeePerTon: house.waterFeePerTon,
    electricityFeePerKwh: house.electricityFeePerKwh,
    otherFee: house.otherFee,
    phone: house.phone ?? '',
    wechat: house.wechat ?? ''
  };
}

export function normalizeHouseForm(payload: HouseForm): HouseForm {
  return {
    ...payload,
    name: payload.name.trim(),
    sourceChannel: payload.sourceChannel || null,
    sourceChannelName: payload.sourceChannelName?.trim() ?? '',
    phone: payload.phone?.trim() ?? '',
    wechat: payload.wechat?.trim() ?? '',
    latitude: payload.latitude ?? undefined,
    longitude: payload.longitude ?? undefined,
    propertyFee: payload.propertyFee ?? undefined,
    waterFeePerTon: payload.waterFeePerTon ?? undefined,
    electricityFeePerKwh: payload.electricityFeePerKwh ?? undefined,
    otherFee: payload.otherFee ?? undefined
  };
}
