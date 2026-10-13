import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin, credentials: true });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
