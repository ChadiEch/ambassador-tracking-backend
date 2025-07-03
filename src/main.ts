import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { webcrypto as _crypto } from 'crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = _crypto;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'https://ambassador-dashboard-production.up.railway.app',  // Your frontend URL
      'http://localhost:3000', // For local dev
    ],
    credentials: true, // Only if using cookies/auth headers!
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log('Server running on port', port);
}

bootstrap();
