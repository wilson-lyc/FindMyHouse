import type { ComputedRef, Ref } from 'vue';
import type { House, HouseFilters, HouseForm } from '../model/house/house';
import type { Location, LocationForm } from '../model/location/location';
import type { CommuteMode, CommuteDistanceResult } from '../model/map/geocode';
import type { ScheduleRoutePlan } from '../lib/schedule/route-planner';

export interface MainLayoutContext {
  houses: Ref<House[]>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  filters: HouseFilters;
  routes: Ref<Map<string, CommuteDistanceResult>>;
  scheduleRoutePlan: Ref<ScheduleRoutePlan | null>;
  commuteMode: Ref<CommuteMode>;
  focusLocation: ComputedRef<Location | null>;
  onlyViewportHouses: Ref<boolean>;
  locations: Ref<Location[]>;
  locationsLoading: Ref<boolean>;
  locationSaving: Ref<boolean>;
  submitHouse: (form: HouseForm) => Promise<void>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
  confirmDeleteHouse: (house: House) => Promise<void>;
  applyHouseFilters: () => Promise<void>;
  toggleViewportHouses: (enabled: boolean) => Promise<void>;
  selectHouse: (house: House) => void;
  showRoute: (house: House) => void;
  showScheduleRoute: (plan: ScheduleRoutePlan) => void;
  submitLocation: (form: LocationForm) => Promise<void>;
  confirmDeleteLocation: (location: Location) => Promise<void>;
  setLocationFocus: (location: Location) => Promise<void>;
  onChatHousesFound: (houses: House[]) => void;
  onChatSelectHouse: (house: House) => void;
}

export const mainLayoutContextKey = Symbol('mainLayoutContext');
