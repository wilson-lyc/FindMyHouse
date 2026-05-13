import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { House } from '../model/house/house';
import type { Location } from '../model/location/location';
import type { DrivingRouteResult } from '../model/map/geocode';

export const useMapStore = defineStore('map', () => {
  const houses = ref<House[]>([]);
  const locations = ref<Location[]>([]);
  const selectedHouseId = ref<string | undefined>();
  const selectedHouseFocusKey = ref(0);
  const routeData = ref<DrivingRouteResult | null>(null);
  const highlightedHouseIds = ref<string[]>([]);

  function setHouses(newHouses: House[]) {
    houses.value = newHouses;
  }

  function setLocations(newLocations: Location[]) {
    locations.value = newLocations;
  }

  function selectHouse(houseId: string | undefined) {
    selectedHouseId.value = houseId;
    selectedHouseFocusKey.value += 1;
  }

  function setRouteData(data: DrivingRouteResult | null) {
    routeData.value = data;
  }

  function setHighlightedHouseIds(ids: string[]) {
    highlightedHouseIds.value = ids;
  }

  return {
    houses,
    locations,
    selectedHouseId,
    selectedHouseFocusKey,
    routeData,
    highlightedHouseIds,
    setHouses,
    setLocations,
    selectHouse,
    setRouteData,
    setHighlightedHouseIds
  };
});
