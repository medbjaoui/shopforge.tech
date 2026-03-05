import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Sécurité HTTP headers (OWASP A05)
  // crossOriginResourcePolicy: cross-origin allows /uploads images to load from other origins (app → api)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Servir les fichiers uploadés comme assets statiques
  const uploadsDir = process.env.UPLOADS_DIR || '/app/uploads';
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      /\.shopforge\.tech$/,
    ],
    credentials: true,
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
