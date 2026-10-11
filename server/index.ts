import { createApp } from './app.ts';import { loadConfig } from './config.ts';
const config=loadConfig();const {app}=await createApp(config);await app.listen({host:config.host,port:config.port});console.log(`RPV API: ${config.apiOrigin} · panel: ${config.apiOrigin}/panel/`);
for(const signal of ['SIGTERM','SIGINT'] as const)process.once(signal,()=>void app.close());
