import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import { createListingSchema, idParamsSchema, listListingsQuerySchema, updateListingSchema } from './dto/listing.schema.js';
import { ListingRepository } from './listing.repository.js';
import { ListingService } from './listing.service.js';

const listingService = new ListingService(new ListingRepository(db));

export async function registerListingRoutes(app: FastifyInstance) {
  app.get('/api/listings', async (request) => {
    const filters = listListingsQuerySchema.parse(request.query);
    return { data: listingService.listListings(filters) };
  });

  app.post('/api/listings', async (request, reply) => {
    const input = createListingSchema.parse(request.body);
    const listing = listingService.createListing(input);
    return reply.code(201).send({ data: listing });
  });

  app.get('/api/listings/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const listing = listingService.getListing(id);

    if (!listing) {
      return reply.code(404).send({ error: 'Listing not found' });
    }

    return { data: listing };
  });

  app.patch('/api/listings/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateListingSchema.parse(request.body);
    const listing = listingService.updateListing(id, input);

    if (!listing) {
      return reply.code(404).send({ error: 'Listing not found' });
    }

    return { data: listing };
  });

  app.delete('/api/listings/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = listingService.deleteListing(id);

    if (!deleted) {
      return reply.code(404).send({ error: 'Listing not found' });
    }

    return reply.code(204).send();
  });
}
