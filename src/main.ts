import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['https://ambassador-dashboard-production.up.railway.app:8080', 'http://localhost:3000'],
    credentials: true,
  });
const port = process.env.PORT || 5000;
await app.listen(port);

}

bootstrap();
