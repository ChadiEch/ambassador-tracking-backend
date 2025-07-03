import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow all origins (public API)
  app.enableCors({
    origin: '*',  // 🔥 Allows any origin
    // credentials: true, // ❌ Do NOT use credentials with origin: '*'
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
