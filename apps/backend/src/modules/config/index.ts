import { db } from '../../database/connection.js';
import { ConfigService } from './config.service.js';

export const configService = new ConfigService(db);
export { ConfigService } from './config.service.js';
export { ConfigRepository } from './config.repository.js';
