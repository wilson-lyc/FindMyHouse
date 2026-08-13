import { z } from 'zod';

/** 通勤模式枚举(前后端共享,与后端存储值一致)。 */
export const commuteModes = ['driving', 'transit', 'cycling', 'walking'] as const;
export type CommuteMode = (typeof commuteModes)[number];

/** 地理编码结果(响应 DTO,与高德返回一致)。 */
export interface GeocodeResult {
  provider: 'amap';
  formattedAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  city?: string;
  district?: string;
}

/** 通勤距离结果(响应 DTO)。 */
export interface CommuteDistanceResult {
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  mode: CommuteMode;
}

/** 通勤路线结果(响应 DTO)。 */
export interface CommuteRouteResult {
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  polyline?: Array<[number, number]>;
  mode: CommuteMode;
}

/** 等时圈环(响应 DTO)。 */
export interface IsochroneRing {
  minutes: number;
  path: Array<[number, number]>;
}

/** 等时圈结果(响应 DTO)。 */
export interface IsochroneResult {
  center: [number, number];
  mode: 'transit';
  rings: IsochroneRing[];
}

/** 驾车距离结果(向后兼容别名)。 */
export type DrivingDistanceResult = CommuteDistanceResult;
/** 驾车路线结果(向后兼容别名)。 */
export type DrivingRouteResult = CommuteRouteResult;

/** 地理编码请求(请求 DTO)。 */
export const geocodeSchema = z.object({
  address: z.string().trim().min(1, 'address is required'),
  city: z.string().trim().optional()
});
export type GeocodeInput = z.infer<typeof geocodeSchema>;

/** 逆地理编码请求(请求 DTO)。 */
export const reverseGeocodeSchema = z.object({
  longitude: z.coerce.number().finite().min(-180).max(180),
  latitude: z.coerce.number().finite().min(-90).max(90)
});
export type ReverseGeocodeInput = z.infer<typeof reverseGeocodeSchema>;

/** 驾车距离请求(请求 DTO)。 */
export const drivingDistanceSchema = z.object({
  origin: z.string().trim().min(1, 'origin is required'),
  destination: z.string().trim().min(1, 'destination is required')
});
export type DrivingDistanceInput = z.infer<typeof drivingDistanceSchema>;

/** 通勤距离请求(请求 DTO)。 */
export const commuteDistanceSchema = z.object({
  origin: z.string().trim().min(1, 'origin is required'),
  destination: z.string().trim().min(1, 'destination is required'),
  commuteMode: z.enum(commuteModes).default('driving')
});
export type CommuteDistanceInput = z.infer<typeof commuteDistanceSchema>;

/** 通勤路线请求(请求 DTO)。 */
export const commuteRouteSchema = z.object({
  origin: z.string().trim().min(1, 'origin is required'),
  destination: z.string().trim().min(1, 'destination is required'),
  commuteMode: z.enum(commuteModes).default('driving')
});
export type CommuteRouteInput = z.infer<typeof commuteRouteSchema>;

/** 等时圈请求(请求 DTO)。 */
export const isochroneSchema = z.object({
  longitude: z.coerce.number().finite().min(-180).max(180),
  latitude: z.coerce.number().finite().min(-90).max(90),
  commuteMode: z.enum(['transit']).default('transit'),
  minutes: z.array(z.coerce.number().int().positive().max(180)).default([10, 20, 30])
});
export type IsochroneInput = z.infer<typeof isochroneSchema>;
