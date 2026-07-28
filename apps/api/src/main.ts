import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  // Increase payload limit to support large base64 image uploads (e.g., clinic logo in print layout)
  // Also extract rawBody for webhook signature verification before the stream is consumed
  app.use(json({ 
    limit: '10mb',
    verify: (req: any, res, buf) => {
      if (req.originalUrl && req.originalUrl.includes('webhooks')) {
        req.rawBody = buf;
      }
    }
  }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  // Enable CORS for the Next.js Frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  await app.listen(3000);
  console.log('Backend successfully restarted and picked up the new .env JWT secret!');
}
bootstrap();
