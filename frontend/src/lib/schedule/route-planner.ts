import type { House, ViewingSchedule } from '../../model/house/house';
import type { Location } from '../../model/location/location';
import type { CommuteDistanceResult } from '../../model/map/geocode';

export interface ScheduleRouteItem {
  house: House;
  schedule: ViewingSchedule;
  date: Date;
  dateKey: string;
}

export interface ScheduleRouteLeg {
  fromName: string;
  toName: string;
  distance: number;
  duration?: number;
  polyline?: Array<[number, number]>;
  estimated: boolean;
  timeConstrained: boolean;
  availableSeconds?: number;
}

export interface ScheduleRoutePlan {
  dateKey: string;
  origin: Location;
  items: ScheduleRouteItem[];
  legs: ScheduleRouteLeg[];
  totalDistance: number;
  totalDuration?: number;
  estimatedLegCount: number;
}

export interface ScheduleRouteDistance {
  distance: number;
  duration?: number;
  estimated?: boolean;
}

export type ScheduleRouteDistanceLookup = Map<string, ScheduleRouteDistance>;

interface Coordinate {
  longitude: number;
  latitude: number;
}

type RoutableScheduleRouteItem = ScheduleRouteItem & {
  house: ScheduleRouteItem['house'] & Coordinate;
};

const earthRadiusMeters = 6371000;

function hasCoordinate(value: { longitude?: number; latitude?: number }): value is Coordinate {
  return value.longitude !== undefined && value.latitude !== undefined;
}

function hasHouseCoordinate(item: ScheduleRouteItem): item is RoutableScheduleRouteItem {
  return hasCoordinate(item.house);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistance(from: Coordinate, to: Coordinate) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scheduleRouteDistanceKey(fromId: string, toId: string) {
  return `${fromId}->${toId}`;
}

function lookupDistance(
  lookup: ScheduleRouteDistanceLookup | undefined,
  fromId: string,
  toId: string,
  fallbackFrom: Coordinate,
  fallbackTo: Coordinate
) {
  const distance = lookup?.get(scheduleRouteDistanceKey(fromId, toId));
  if (distance) {
    return {
      distance: distance.distance,
      duration: distance.duration,
      estimated: distance.estimated ?? false
    };
  }

  return {
    distance: haversineDistance(fallbackFrom, fallbackTo),
    estimated: true
  };
}

function firstLegDistance(
  origin: Location & Coordinate,
  item: RoutableScheduleRouteItem,
  lookup?: ScheduleRouteDistanceLookup,
  routes?: Map<string, CommuteDistanceResult>
) {
  const distance = lookupDistance(lookup, origin.id, item.house.id, origin, item.house);
  if (!distance.estimated) return distance;

  const route = routes?.get(item.house.id);
  if (route) {
    return {
      distance: route.distance,
      duration: route.duration,
      estimated: false
    };
  }

  return distance;
}

function itemDistance(
  from: RoutableScheduleRouteItem,
  to: RoutableScheduleRouteItem,
  lookup?: ScheduleRouteDistanceLookup
) {
  return lookupDistance(lookup, from.house.id, to.house.id, from.house, to.house);
}

export function createScheduleRoutePlan(
  dateKey: string,
  items: ScheduleRouteItem[],
  origin: Location | null,
  distanceLookup?: ScheduleRouteDistanceLookup,
  routes?: Map<string, CommuteDistanceResult>
): ScheduleRoutePlan | null {
  if (!origin || !hasCoordinate(origin)) return null;
  const routeOrigin = origin as Location & Coordinate;

  const ordered = items.filter(hasHouseCoordinate).sort((a, b) => a.date.getTime() - b.date.getTime());
  if (ordered.length === 0) return null;

  const legs: ScheduleRouteLeg[] = ordered.map((item, index) => {
    if (index === 0) {
      const leg = firstLegDistance(routeOrigin, item, distanceLookup, routes);
      return {
        fromName: origin.name,
        toName: item.house.name,
        ...leg,
        timeConstrained: false
      };
    }

    const availableSeconds = Math.max(0, Math.round((item.date.getTime() - ordered[index - 1].date.getTime()) / 1000));

    return {
      fromName: ordered[index - 1].house.name,
      toName: item.house.name,
      ...itemDistance(ordered[index - 1], item, distanceLookup),
      timeConstrained: true,
      availableSeconds
    };
  });

  const totalDuration = legs.reduce<number | undefined>((total, leg) => {
    if (total === undefined || leg.duration === undefined) return undefined;
    return total + leg.duration;
  }, 0);

  return {
    dateKey,
    origin: routeOrigin,
    items: ordered,
    legs,
    totalDistance: legs.reduce((total, leg) => total + leg.distance, 0),
    totalDuration,
    estimatedLegCount: legs.filter((leg) => leg.estimated).length
  };
}
