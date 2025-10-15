import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow all CORS (for testing)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Log all registered routes for debugging
  const server = app.getHttpServer();
  const router = server._events.request._router;
  if (router) {
    const routes = router.stack
      .filter((r: any) => r.route)
      .map((r: any) => {
        return {
          path: Object.keys(r.route.methods)[0].toUpperCase(),
          route: r.route.path,
        };
      });
    console.log('Registered routes:', routes);
  }

  // Use the port from Railway, else 5000 as fallback
  const port = 5000;
  await app.listen(port, '0.0.0.0');  // <-- IMPORTANT!
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
}

bootstrap();