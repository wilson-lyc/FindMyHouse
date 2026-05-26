import { z } from 'zod';

export const geocodeSchema = z.object({
  address: z.string().trim().min(1, 'address is required'),
  city: z.string().trim().optional()
});

export const reverseGeocodeSchema = z.object({
  longitude: z.coerce.number().finite().min(-180).max(180),
  latitude: z.coerce.number().finite().min(-90).max(90)
});

export const commuteModeSchema = z.enum(['driving', 'transit', 'cycling', 'walking']);

export const drivingDistanceSchema = z.object({
  origin: z.string().trim().min(1, 'origin is required'),
  destination: z.string().trim().min(1, 'destination is required')
});

export const commuteDistanceSchema = z.object({
  origin: z.string().trim().min(1, 'origin is required'),
  destination: z.string().trim().min(1, 'destination is required'),
  commuteMode: commuteModeSchema.default('driving')
});

export const commuteRouteSchema = z.object({
  origin: z.string().trim().min(1, 'origin is required'),
  destination: z.string().trim().min(1, 'destination is required'),
  commuteMode: commuteModeSchema.default('driving')
});

export const isochroneSchema = z.object({
  longitude: z.coerce.number().finite().min(-180).max(180),
  latitude: z.coerce.number().finite().min(-90).max(90),
  commuteMode: z.enum(['transit']).default('transit'),
  minutes: z.array(z.coerce.number().int().positive().max(180)).default([10, 20, 30])
});
