import type { ComputedRef, Ref } from 'vue';
import type { ConfirmCreateHouseAction, ConfirmCreateHouseResult, ConfirmCreateLocationAction, ConfirmCreateLocationResult } from '../api/chat/chat-api';
import type { House, HouseFilters, HouseForm } from '../model/house/house';
import type { Location, LocationForm } from '../model/location/location';
import type { DrivingRouteResult } from '../model/map/geocode';

export interface MainLayoutContext {
  houses: Ref<House[]>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  filters: HouseFilters;
  drivingRoutes: Ref<Map<string, DrivingRouteResult>>;
  focusLocation: ComputedRef<Location | null>;
  onlyViewportHouses: Ref<boolean>;
  locations: Ref<Location[]>;
  locationsLoading: Ref<boolean>;
  locationSaving: Ref<boolean>;
  openCreateDialog: () => void;
  openEditDialog: (house: House) => void;
  submitHouse: (form: HouseForm) => Promise<void>;
  confirmDeleteHouse: (house: House) => Promise<void>;
  applyHouseFilters: () => Promise<void>;
  toggleViewportHouses: (enabled: boolean) => Promise<void>;
  selectHouse: (house: House) => void;
  showRoute: (house: House) => void;
  openCreateLocationDialog: () => void;
  openEditLocationDialog: (location: Location) => void;
  submitLocation: (form: LocationForm) => Promise<void>;
  confirmDeleteLocation: (location: Location) => Promise<void>;
  setLocationFocus: (location: Location) => Promise<void>;
  onChatHousesFound: (houses: House[]) => void;
  onChatSelectHouse: (house: House) => void;
  onAgentConfirmCreateHouse: (action: ConfirmCreateHouseAction, done: (result: ConfirmCreateHouseResult) => void) => void;
  onAgentConfirmCreateLocation: (action: ConfirmCreateLocationAction, done: (result: ConfirmCreateLocationResult) => void) => void;
}

export const mainLayoutContextKey = Symbol('mainLayoutContext');
