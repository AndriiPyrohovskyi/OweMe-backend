import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('OweMe API')
    .setDescription('API для управління боргами, групами та друзями')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Аутентифікація та авторизація')
    .addTag('friends', 'Управління друзями та запитами')
    .addTag('groups', 'Управління групами та запитами')
    .addTag('owes', 'Управління боргами та поверненнями')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  const port = process.env.PORT ?? 3000; 
  await app.listen(port);
  console.log(`Api running at http://localhost:${port}/`);
  console.log(`Swagger documentation at http://localhost:${port}/api`);
}
bootstrap();
