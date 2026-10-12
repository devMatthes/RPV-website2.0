import { createHandler } from './app.ts';
import type { WorkerEnv } from './config.ts';

export default createHandler() satisfies ExportedHandler<WorkerEnv>;
