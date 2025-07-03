import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// If you use polyfill, keep it above
import { webcrypto as _crypto } from 'crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = _crypto;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'https://ambassador-dashboard-production.up.railway.app', // Frontend (prod)
      'http://localhost:3000', // Frontend (dev)
    ],
    credentials: true, // only if your requests use cookies or authorization headers
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log('Listening on port', port);
}
bootstrap();
