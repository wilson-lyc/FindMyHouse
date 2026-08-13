import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { House } from '../model/house/house';
import type { Location } from '../model/location/location';
import type { CommuteDistanceResult, MapBoundsFilter, CommuteMode } from '../model/map/geocode';
import type { ScheduleRoutePlan } from '../lib/schedule/route-planner';

export type MapPanelMode = 'default' | 'house-search-results' | 'point-route' | 'multi-point-route' | 'isochrone' | 'distance-ring';

export type MapPointKind = 'house' | 'location';

export type IsochroneMode = 'driving' | 'transit';

export interface IsochroneRequest {
  location: Location;
  mode: IsochroneMode;
  requestKey: number;
}

export interface DistanceRingRequest {
  location: Location;
  radii: number[];
  requestKey: number;
}

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
  const isochroneRequest = ref<IsochroneRequest | null>(null);
  const isochroneRequestKey = ref(0);
  const distanceRingRequest = ref<DistanceRingRequest | null>(null);
  const distanceRingRequestKey = ref(0);

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
    isochroneRequest.value = null;
    distanceRingRequest.value = null;
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
    isochroneRequest.value = null;
    distanceRingRequest.value = null;
    mode.value = searchResultHouses.value.length > 0 ? 'house-search-results' : 'default';
  }

  function showScheduleRoute(plan: ScheduleRoutePlan) {
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    activeRouteHouseId.value = null;
    scheduleRoutePlan.value = plan;
    isochroneRequest.value = null;
    distanceRingRequest.value = null;
    mode.value = 'multi-point-route';
  }

  function showIsochrone(location: Location, isochroneMode: IsochroneMode) {
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    distanceRingRequest.value = null;
    isochroneRequestKey.value += 1;
    isochroneRequest.value = {
      location,
      mode: isochroneMode,
      requestKey: isochroneRequestKey.value
    };
    mode.value = 'isochrone';
  }

  function clearIsochrone() {
    isochroneRequest.value = null;
    mode.value = searchResultHouses.value.length > 0 ? 'house-search-results' : 'default';
  }

  function showDistanceRing(location: Location, radii = [1000, 3000, 5000]) {
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    isochroneRequest.value = null;
    distanceRingRequestKey.value += 1;
    distanceRingRequest.value = {
      location,
      radii,
      requestKey: distanceRingRequestKey.value
    };
    mode.value = 'distance-ring';
  }

  function clearDistanceRing() {
    distanceRingRequest.value = null;
    mode.value = searchResultHouses.value.length > 0 ? 'house-search-results' : 'default';
  }

  function showHouseSearchResults(results: House[]) {
    searchResultHouses.value = results;
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    isochroneRequest.value = null;
    distanceRingRequest.value = null;
    mode.value = 'house-search-results';
  }

  function clearHouseSearchResults() {
    searchResultHouses.value = [];
    mode.value = routeData.value
      ? 'point-route'
      : scheduleRoutePlan.value
        ? 'multi-point-route'
        : isochroneRequest.value
          ? 'isochrone'
          : distanceRingRequest.value
            ? 'distance-ring'
          : 'default';
  }

  function resetMode() {
    searchResultHouses.value = [];
    routeData.value = null;
    pointRouteOrigin.value = null;
    pointRouteDestination.value = null;
    pointRouteRequestKey.value += 1;
    scheduleRoutePlan.value = null;
    activeRouteHouseId.value = null;
    isochroneRequest.value = null;
    distanceRingRequest.value = null;
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
    isochroneRequest,
    distanceRingRequest,
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
    showIsochrone,
    clearIsochrone,
    showDistanceRing,
    clearDistanceRing,
    showHouseSearchResults,
    clearHouseSearchResults,
    resetMode
  };
});
