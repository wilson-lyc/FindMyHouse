import type { FastifyInstance } from 'fastify';
import { db } from '../../database/connection.js';
import {
  createScheduleSchema,
  idParamsSchema,
  listSchedulesQuerySchema,
  updateScheduleSchema
} from '@findmyhouse/contracts';
import { ScheduleRepository } from './schedule.repository.js';
import { ScheduleService } from './schedule.service.js';

const scheduleService = new ScheduleService(new ScheduleRepository(db));

export async function registerScheduleRoutes(app: FastifyInstance) {
  app.get('/api/schedules', async (request, reply) => {
    const filters = listSchedulesQuerySchema.parse(request.query);
    return reply.ok(scheduleService.listSchedules(filters));
  });

  app.post('/api/schedules', async (request, reply) => {
    const input = createScheduleSchema.parse(request.body);
    const schedule = scheduleService.createSchedule(input);
    return reply.created(schedule, '日程已创建');
  });

  app.patch('/api/schedules/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const input = updateScheduleSchema.parse(request.body);
    const schedule = scheduleService.updateSchedule(id, input);

    if (!schedule) {
      return reply.fail({ code: 404, message: '日程不存在', error: 'SCHEDULE_NOT_FOUND' });
    }

    return reply.ok(schedule, '日程已更新');
  });

  app.delete('/api/schedules/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const deleted = scheduleService.deleteSchedule(id);

    if (!deleted) {
      return reply.fail({ code: 404, message: '日程不存在', error: 'SCHEDULE_NOT_FOUND' });
    }

    return reply.noContent();
  });
}
