import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: process.env.WEB_ORIGIN || 'http://localhost:5173', credentials: true } });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  const config = new DocumentBuilder().setTitle('Mercadummy API').setDescription('API de e-commerce com CQRS, PostgreSQL, MongoDB e Redis').setVersion('1.0').addCookieAuth('mercadummy.sid').addApiKey({type:'apiKey',name:'X-API-Key',in:'header'}, 'api-key').build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(process.env.API_PORT || 3000, '0.0.0.0');
}
bootstrap();
