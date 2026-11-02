import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

async function bootstrap() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`[Backend] Gantavya API running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`[Backend] Health check: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`[Backend] API Documentation: http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal) => {
    console.log(`[Backend] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Backend] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[Backend] Bootstrap failure:', err);
  process.exit(1);
});

