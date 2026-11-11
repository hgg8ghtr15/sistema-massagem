import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { MassagensModule } from './massagens/massagens.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      //permite acessar as configurações em qualquer módulo sem importar o ConfigModule repetidamente.
      isGlobal: true, 
      cache: true,
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    UsuariosModule,
    MassagensModule,
    AgendamentosModule,
    NotificacoesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}