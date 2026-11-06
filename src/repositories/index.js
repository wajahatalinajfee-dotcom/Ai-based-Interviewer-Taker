import { env } from '../config/env.js';

export const repo = env.databaseUrl ? await import('./pg.repository.js') : await import('./memory.repository.js');
