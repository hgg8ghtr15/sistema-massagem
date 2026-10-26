import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Cria a aplicação NestJS com o módulo principal AppModule
  const app = await NestFactory.create(AppModule);

  //Todas as rotas terão o prefixo:
  app.setGlobalPrefix('api');

  // Permite que um frontend se comunique com o backend durante o desenvolvimento.
  app.enableCors();

  app.useGlobalPipes(

    /**
     * Validar os dados recebidos;
     * Remover propriedades não declaradas;
     * Rejeitar propriedades desconhecidas;
     * Converter tipos quando possível.
     */
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de Agendamento de Massagem')
    .setDescription('API para gerenciamento de usuários e agendamentos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  console.log(`Aplicação executando em http://localhost:${port}/api`);
  console.log(`Documentação disponível em http://localhost:${port}/docs`);
}

void bootstrap();