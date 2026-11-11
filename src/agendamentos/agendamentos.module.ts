import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgendamentosController } from './agendamentos.controller';
import { AgendamentosService } from './agendamentos.service';
import { GestorAgendamentoGuard } from './guards/gestor-agendamento.guard';

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [AgendamentosController],
  providers: [AgendamentosService, JwtAuthGuard, GestorAgendamentoGuard],
  exports: [AgendamentosService],
})
export class AgendamentosModule {}
