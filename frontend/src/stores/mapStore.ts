import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { House } from '../model/house/house';
import type { Location } from '../model/location/location';
import type { CommuteRouteResult, MapBoundsFilter, CommuteMode } from '../model/map/geocode';

export const useMapStore = defineStore('map', () => {
  const houses = ref<House[]>([]);
  const locations = ref<Location[]>([]);
  const selectedHouseId = ref<string | undefined>();
  const selectedHouseFocusKey = ref(0);
  const currentBounds = ref<MapBoundsFilter | null>(null);
  const onlyViewportHouses = ref(false);
  const commuteMode = ref<CommuteMode>('driving');
  const routes = ref<Map<string, CommuteRouteResult>>(new Map());
  const routeData = ref<CommuteRouteResult | null>(null);
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

  function setCommuteMode(mode: CommuteMode) {
    commuteMode.value = mode;
  }

  function setRoutes(newRoutes: Map<string, CommuteRouteResult>) {
    routes.value = newRoutes;

    if (!activeRouteHouseId.value) return;

    routeData.value = newRoutes.get(activeRouteHouseId.value) ?? null;
    if (!routeData.value) {
      activeRouteHouseId.value = null;
    }
  }

  function removeRoute(houseId: string) {
    const nextRoutes = new Map(routes.value);
    nextRoutes.delete(houseId);
    setRoutes(nextRoutes);
  }

  function showRoute(houseId: string) {
    const route = routes.value.get(houseId);
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
    commuteMode,
    routes,
    routeData,
    activeRouteHouseId,
    highlightedHouseIds,
    setHouses,
    setLocations,
    selectHouse,
    setCurrentBounds,
    setOnlyViewportHouses,
    setCommuteMode,
    setRoutes,
    removeRoute,
    showRoute,
    clearRoute,
    setHighlightedHouseIds,
    clearHighlightedHouseIds
  };
});
