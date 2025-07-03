import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { webcrypto as _crypto } from 'crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = _crypto;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'https://ambassador-dashboard-production.up.railway.app',
      'http://localhost:3000'
    ],
    credentials: true,
  });

  const port = process.env.PORT || 5000;
  // CRITICAL: Listen on 0.0.0.0, not localhost
  await app.listen(port, '0.0.0.0');
  console.log('CORS enabled, listening on', port);
}

bootstrap();
