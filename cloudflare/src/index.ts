import { createHandler } from './app.ts';
import { cleanupFiles } from './storage.ts';
import type { WorkerEnv } from './config.ts';

export default { ...createHandler(), async scheduled(_event, env) { await cleanupFiles(env, Date.now()); } } satisfies ExportedHandler<WorkerEnv>;
