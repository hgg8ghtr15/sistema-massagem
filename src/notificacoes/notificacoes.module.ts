import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailDeliveryService } from './email-delivery.service';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesWorker } from './notificacoes.worker';

@Module({
  imports: [AuthModule],
  controllers: [NotificacoesController],
  providers: [EmailDeliveryService, NotificacoesService, NotificacoesWorker],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
