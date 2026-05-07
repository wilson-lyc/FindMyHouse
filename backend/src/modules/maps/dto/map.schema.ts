import { z } from 'zod';

export const geocodeSchema = z.object({
  address: z.string().trim().min(1, 'address is required'),
  city: z.string().trim().optional()
});
