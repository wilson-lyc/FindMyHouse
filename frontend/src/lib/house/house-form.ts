import type { CustomFeeItem, House, HouseForm } from '../../model/house/house';

function normalizeViewingAtForPicker(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function normalizeViewingAtForApi(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

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
    contactName: '',
    phone: '',
    wechat: '',
    contactNotes: '',
    viewingSchedules: []
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
    contactName: house.contactName ?? '',
    phone: house.phone ?? '',
    wechat: house.wechat ?? '',
    contactNotes: house.contactNotes ?? '',
    viewingSchedules: (house.viewingSchedules ?? []).map((schedule) => ({
      ...schedule,
      viewingAt: normalizeViewingAtForPicker(schedule.viewingAt)
    }))
  };
}

export function normalizeHouseForm(payload: HouseForm): HouseForm {
  return {
    ...payload,
    name: payload.name.trim(),
    sourceChannel: payload.sourceChannel || null,
    contactName: payload.contactName?.trim() ?? '',
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
    feeNotes: payload.feeNotes?.trim() ?? '',
    viewingSchedules: payload.viewingSchedules
      ?.filter((schedule) => schedule.viewingAt)
      .map((schedule) => ({
        id: schedule.id,
        viewingAt: normalizeViewingAtForApi(schedule.viewingAt),
        note: schedule.note?.trim() || undefined
      }))
  };
}
