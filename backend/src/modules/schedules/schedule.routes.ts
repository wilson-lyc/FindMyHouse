import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import {
  createScheduleSchema,
  idParamsSchema,
  listSchedulesQuerySchema,
  updateScheduleSchema
} from './dto/schedule.schema.js';
import { ScheduleRepository } from './schedule.repository.js';
import { ScheduleService } from './schedule.service.js';

const scheduleService = new ScheduleService(new ScheduleRepository(db));

export async function registerScheduleRoutes(app: FastifyInstance) {
  app.get('/api/schedules', async (request) => {
    const filters = listSchedulesQuerySchema.parse(request.query);
    return { data: scheduleService.listSchedules(filters) };
  });

  app.post('/api/schedules', async (request, reply) => {
    const input = createScheduleSchema.parse(request.body);
    const schedule = scheduleService.createSchedule(input);
    return reply.code(201).send({ data: schedule });
  });

  app.patch('/api/schedules/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateScheduleSchema.parse(request.body);
    const schedule = scheduleService.updateSchedule(id, input);

    if (!schedule) {
      return reply.code(404).send({ error: 'Schedule not found' });
    }

    return { data: schedule };
  });

  app.delete('/api/schedules/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = scheduleService.deleteSchedule(id);

    if (!deleted) {
      return reply.code(404).send({ error: 'Schedule not found' });
    }

    return reply.code(204).send();
  });
}
