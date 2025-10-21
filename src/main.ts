import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Видаляє поля, які не описані в DTO
    forbidNonWhitelisted: true, // Повертає помилку, якщо є зайві поля
    transform: true, // Автоматично трансформує типи (наприклад, string -> number)
  }));
  
  const port = process.env.PORT ?? 3000; 
  await app.listen(port);
  console.log(`Api running at http://localhost:${port}/`);
}
bootstrap();
