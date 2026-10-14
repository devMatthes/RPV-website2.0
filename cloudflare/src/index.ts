import { createHandler } from './app.ts';
import { maintenance } from './retention.ts';
import type { WorkerEnv } from './config.ts';

export default { ...createHandler(), async scheduled(_event, env) {
  try { const result = await maintenance(env, Date.now()); console.log(JSON.stringify({ event: 'maintenance', environment: env.ENVIRONMENT, ...result }));
    if (result && 'purgeFailed' in result && result.purgeFailed) throw new Error('Purge pending');
  }
  catch { console.error(JSON.stringify({ event: 'maintenance_failed', environment: env.ENVIRONMENT })); throw new Error('Maintenance failed'); }
} } satisfies ExportedHandler<WorkerEnv>;
