import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './shared/database/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀  Server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   API prefix:  ${env.API_PREFIX}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectPrisma();
    console.log('Database disconnected. Bye.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));