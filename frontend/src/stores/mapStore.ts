import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { House } from '../model/house/house';
import type { Location } from '../model/location/location';
import type { DrivingRouteResult, MapBoundsFilter } from '../model/map/geocode';

export const useMapStore = defineStore('map', () => {
  const houses = ref<House[]>([]);
  const locations = ref<Location[]>([]);
  const selectedHouseId = ref<string | undefined>();
  const selectedHouseFocusKey = ref(0);
  const currentBounds = ref<MapBoundsFilter | null>(null);
  const onlyViewportHouses = ref(false);
  const drivingRoutes = ref<Map<string, DrivingRouteResult>>(new Map());
  const routeData = ref<DrivingRouteResult | null>(null);
  const activeRouteHouseId = ref<string | null>(null);
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

  function setCurrentBounds(bounds: MapBoundsFilter) {
    currentBounds.value = bounds;
  }

  function setOnlyViewportHouses(enabled: boolean) {
    onlyViewportHouses.value = enabled;
  }

  function setDrivingRoutes(routes: Map<string, DrivingRouteResult>) {
    drivingRoutes.value = routes;

    if (!activeRouteHouseId.value) return;

    routeData.value = routes.get(activeRouteHouseId.value) ?? null;
    if (!routeData.value) {
      activeRouteHouseId.value = null;
    }
  }

  function removeDrivingRoute(houseId: string) {
    const nextRoutes = new Map(drivingRoutes.value);
    nextRoutes.delete(houseId);
    setDrivingRoutes(nextRoutes);
  }

  function showRoute(houseId: string) {
    const route = drivingRoutes.value.get(houseId);
    if (!route) return false;

    routeData.value = route;
    activeRouteHouseId.value = houseId;
    return true;
  }

  function clearRoute() {
    routeData.value = null;
    activeRouteHouseId.value = null;
  }

  function setHighlightedHouseIds(ids: string[]) {
    highlightedHouseIds.value = ids;
  }

  function clearHighlightedHouseIds() {
    highlightedHouseIds.value = [];
  }

  return {
    houses,
    locations,
    selectedHouseId,
    selectedHouseFocusKey,
    currentBounds,
    onlyViewportHouses,
    drivingRoutes,
    routeData,
    activeRouteHouseId,
    highlightedHouseIds,
    setHouses,
    setLocations,
    selectHouse,
    setCurrentBounds,
    setOnlyViewportHouses,
    setDrivingRoutes,
    removeDrivingRoute,
    showRoute,
    clearRoute,
    setHighlightedHouseIds,
    clearHighlightedHouseIds
  };
});
