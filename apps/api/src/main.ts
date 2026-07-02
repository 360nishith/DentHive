import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for the Next.js Frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  await app.listen(3000);
  console.log('Backend successfully restarted and picked up the new .env JWT secret!');
}
bootstrap();
