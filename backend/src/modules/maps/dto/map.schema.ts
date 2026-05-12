import { z } from 'zod';

export const geocodeSchema = z.object({
  address: z.string().trim().min(1, 'address is required'),
  city: z.string().trim().optional()
});

export const drivingDistanceSchema = z.object({
  origin: z.string().trim().min(1, 'origin is required'),
  destination: z.string().trim().min(1, 'destination is required')
});
