import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { webcrypto as _crypto } from 'crypto';

// Ignore TypeScript error, assign for runtime
// @ts-ignore
// polyfill-crypto.js
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'https://ambassador-dashboard-production.up.railway.app:8080',
      'http://localhost:3000',
    ],
    credentials: true,
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  console.log('DATABASE:', process.env.database);
}

bootstrap();
