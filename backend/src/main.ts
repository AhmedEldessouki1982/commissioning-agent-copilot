import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Load backend/.env before the application starts. A missing file is fine
// (the operator may supply the variables another way); anything else — bad
// permissions, a malformed file — must surface immediately.
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
}
void bootstrap();
