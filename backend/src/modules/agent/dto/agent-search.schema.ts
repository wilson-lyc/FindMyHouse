import { z } from 'zod';
import { houseSourceChannels, houseStatuses } from '../../houses/domain/house.js';

export const houseAgentSearchFiltersSchema = z.object({
  status: z.enum(houseStatuses).optional(),
  sourceChannel: z.enum(houseSourceChannels).optional(),
  q: z.string().trim().min(1).optional(),
  keywords: z.array(z.string().trim().min(1)).max(8).optional(),
  minRentPrice: z.number().int().nonnegative().optional(),
  maxRentPrice: z.number().int().nonnegative().optional(),
  minBedroomCount: z.number().int().nonnegative().optional(),
  maxBedroomCount: z.number().int().nonnegative().optional(),
  minLivingRoomCount: z.number().int().nonnegative().optional(),
  maxLivingRoomCount: z.number().int().nonnegative().optional(),
  minBathroomCount: z.number().int().nonnegative().optional(),
  maxBathroomCount: z.number().int().nonnegative().optional(),
  minLatitude: z.number().finite().optional(),
  maxLatitude: z.number().finite().optional(),
  minLongitude: z.number().finite().optional(),
  maxLongitude: z.number().finite().optional(),
  limit: z.number().int().positive().max(100).default(20)
});

export const directHouseAgentSearchSchema = z.object({
  filters: houseAgentSearchFiltersSchema.optional().transform((value) => value ?? houseAgentSearchFiltersSchema.parse({}))
});

export const openAiHouseAgentSearchSchema = z.object({
  query: z.string().trim().min(1, 'query is required'),
  limit: z.number().int().positive().max(100).default(20)
});

export type HouseAgentSearchFilters = z.infer<typeof houseAgentSearchFiltersSchema>;
export type OpenAiHouseAgentSearchInput = z.infer<typeof openAiHouseAgentSearchSchema>;
