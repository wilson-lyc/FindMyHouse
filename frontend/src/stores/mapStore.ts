import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { House } from '../model/house/house';
import type { Location } from '../model/location/location';
import type { CommuteDistanceResult, MapBoundsFilter, CommuteMode } from '../model/map/geocode';
import type { ScheduleRoutePlan } from '../lib/schedule/route-planner';

export type MapPanelMode = 'default' | 'house-search-results' | 'point-route' | 'multi-point-route';

export type MapPointKind = 'house' | 'location';

export interface MapRoutePoint {
  id: string;
  kind: MapPointKind;
  name: string;
  address?: string;
  longitude: number;
  latitude: number;
}

export const useMapStore = defineStore('map', () => {
  const houses = ref<House[]>([]);
  const locations = ref<Location[]>([]);
  const mode = ref<MapPanelMode>('default');
  const selectedHouseId = ref<string | undefined>();
  const selectedHouseFocusKey = ref(0);
  const currentBounds = ref<MapBoundsFilter | null>(null);
  const onlyViewportHouses = ref(false);
  const commuteMode = ref<CommuteMode>('driving');
  const routes = ref<Map<string, CommuteDistanceResult>>(new Map());
  const routeData = ref<CommuteDistanceResult | null>(null);
  const pointRouteOrigin = ref<MapRoutePoint | null>(null);
  const pointRouteDestination = ref<MapRoutePoint | null>(null);
  const pointRouteRequestKey = ref(0);
  const scheduleRoutePlan = ref<ScheduleRoutePlan | null>(null);
  const activeRouteHouseId = ref<string | null>(null);
  const searchResultHouses = ref<House[]>([]);

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

  function setRoutes(newRoutes: Map<string, CommuteDistanceResult>) {
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

  function houseToRoutePoint(house: House): MapRoutePoint | null {
    if (house.longitude === undefined || house.latitude === undefined) return null;

    return {
      id: house.id,
      kind: 'house',
      name: house.name,
      address: house.address,
      longitude: house.longitude,
      latitude: house.latitude
    };
  }

  function locationToRoutePoint(location: Location): MapRoutePoint | null {
    if (location.longitude === undefined || location.latitude === undefined) return null;

    return {
      id: location.id,
      kind: 'location',
      name: location.name,
      address: location.address,
      longitude: location.longitude,
      latitude: location.latitude
    };
  }

  function routePointKey(point: MapRoutePoint) {
    return `${point.kind}:${point.id}`;
  }

  function showPointRoute(origin: MapRoutePoint, destination: MapRoutePoint, route?: CommuteDistanceResult | null) {
    routeData.value = route ?? null;
    pointRouteOrigin.value = origin;
    pointRouteDestination.value = destination;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    pointRouteRequestKey.value += 1;
    mode.value = 'point-route';
  }

  function setPointRouteResult(route: CommuteDistanceResult) {
    routeData.value = route;
  }

  function showRoute(houseId: string) {
    const route = routes.value.get(houseId);
    if (!route) return false;

    const house = houses.value.find((item) => item.id === houseId);
    const origin = house ? houseToRoutePoint(house) : null;
    const destination = locations.value.find((location) => location.isFocus);
    const destinationPoint = destination ? locationToRoutePoint(destination) : null;
    if (!origin || !destinationPoint) return false;

    showPointRoute(origin, destinationPoint, route);
    activeRouteHouseId.value = houseId;
    return true;
  }

  function clearRoute() {
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    mode.value = searchResultHouses.value.length > 0 ? 'house-search-results' : 'default';
  }

  function showScheduleRoute(plan: ScheduleRoutePlan) {
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    activeRouteHouseId.value = null;
    scheduleRoutePlan.value = plan;
    mode.value = 'multi-point-route';
  }

  function showHouseSearchResults(results: House[]) {
    searchResultHouses.value = results;
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    mode.value = 'house-search-results';
  }

  function clearHouseSearchResults() {
    searchResultHouses.value = [];
    mode.value = routeData.value ? 'point-route' : scheduleRoutePlan.value ? 'multi-point-route' : 'default';
  }

  function resetMode() {
    searchResultHouses.value = [];
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    mode.value = 'default';
  }

  return {
    houses,
    locations,
    mode,
    selectedHouseId,
    selectedHouseFocusKey,
    currentBounds,
    onlyViewportHouses,
    commuteMode,
    routes,
    routeData,
    pointRouteOrigin,
    pointRouteDestination,
    pointRouteRequestKey,
    scheduleRoutePlan,
    activeRouteHouseId,
    searchResultHouses,
    setHouses,
    setLocations,
    selectHouse,
    setCurrentBounds,
    setOnlyViewportHouses,
    setCommuteMode,
    setRoutes,
    removeRoute,
    routePointKey,
    showPointRoute,
    setPointRouteResult,
    showRoute,
    clearRoute,
    showScheduleRoute,
    showHouseSearchResults,
    clearHouseSearchResults,
    resetMode
  };
});
