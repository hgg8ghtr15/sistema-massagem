import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db } from '../prisma/db';
import { StatusAgendamento } from '../agendamentos/agendamento-status.enum';
import { criarNotificacoes } from './notificacoes.helper';
import { EmailDeliveryService } from './email-delivery.service';

const STATUS_ATIVOS = [
  StatusAgendamento.PENDENTE,
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.REAGENDAMENTO_SOLICITADO,
  StatusAgendamento.REAGENDADO,
];

@Injectable()
export class NotificacoesWorker {
  private readonly logger = new Logger(NotificacoesWorker.name);

  constructor(
    private readonly emailDelivery: EmailDeliveryService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enviarEmailsPendentes(): Promise<void> {
    if (!this.emailDelivery.configurado) {
      return;
    }

    const agora = new Date();
    const agoraIso = agora.toISOString();
    const processamentoExpirado = new Date(
      agora.getTime() - 15 * 60_000,
    ).toISOString();
    await db.orm.public.Notificacao.where({
      emailStatus: 'PROCESSANDO',
    })
      .where((notificacao) =>
        notificacao.emailProcessandoEm.lt(processamentoExpirado),
      )
      .update({
        emailStatus: 'PENDENTE',
        emailProcessandoEm: null,
        emailProximaTentativaEm: agoraIso,
      });

    const pendentes = await db.orm.public.Notificacao.where({
      emailStatus: 'PENDENTE',
    })
      .where((notificacao) =>
        notificacao.emailProximaTentativaEm.lte(agoraIso),
      )
      .include('usuario', (usuario) => usuario.select('nome', 'email'))
      .orderBy((notificacao) => notificacao.createdAt.asc())
      .limit(50)
      .all();

    for (const notificacao of pendentes) {
      const tentativas = notificacao.emailTentativas + 1;
      const reivindicada = await db.orm.public.Notificacao.where({
        id: notificacao.id,
        emailStatus: 'PENDENTE',
      })
        .where((item) => item.emailProximaTentativaEm.lte(agoraIso))
        .update({
          emailStatus: 'PROCESSANDO',
          emailTentativas: tentativas,
          emailProcessandoEm: agoraIso,
        });
      if (!reivindicada) {
        continue;
      }

      try {
        if (!notificacao.usuario) {
          throw new Error('Destinatário da notificação não encontrado.');
        }
        await this.emailDelivery.enviar(
          notificacao.usuario.email,
          notificacao.usuario.nome,
          notificacao.titulo,
          notificacao.mensagem,
        );
        await db.orm.public.Notificacao.where({
          id: notificacao.id,
          emailStatus: 'PROCESSANDO',
        }).update({
          emailStatus: 'ENVIADA',
          emailEnviadoEm: new Date().toISOString(),
          emailProcessandoEm: null,
          emailErro: null,
        });
      } catch (error) {
        const erro =
          error instanceof Error ? `${error.name}: ${error.message}` : 'Erro desconhecido.';
        const status = tentativas >= 3 ? 'FALHA' : 'PENDENTE';
        const proximaTentativa = new Date(
          Date.now() + Math.min(60, 5 * 2 ** (tentativas - 1)) * 60_000,
        ).toISOString();
        await db.orm.public.Notificacao.where({
          id: notificacao.id,
          emailStatus: 'PROCESSANDO',
        }).update({
          emailStatus: status,
          emailProcessandoEm: null,
          emailProximaTentativaEm: proximaTentativa,
          emailErro: erro.slice(0, 1000),
        });
        this.logger.error(
          `Falha ao enviar e-mail da notificação ${notificacao.id} (tentativa ${tentativas}).`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async enviarLembretes24h(): Promise<void> {
    const agora = new Date();
    const agoraIso = agora.toISOString();
    const limite = new Date(agora.getTime() + 24 * 60 * 60_000).toISOString();
    const agendamentos = await db.orm.public.Agendamento.where((agendamento) =>
      agendamento.status.in(STATUS_ATIVOS),
    )
      .where({ lembrete24hEnviadoEm: null })
      .where((agendamento) => agendamento.dataHora.gt(agoraIso))
      .where((agendamento) => agendamento.dataHora.lte(limite))
      .orderBy((agendamento) => agendamento.dataHora.asc())
      .limit(100)
      .all();

    for (const agendamento of agendamentos) {
      await db.transaction(async (tx) => {
        const atual = await tx.orm.public.Agendamento.first({
          id: agendamento.id,
        });
        if (
          !atual ||
          !STATUS_ATIVOS.some((status) => status === atual.status) ||
          atual.lembrete24hEnviadoEm ||
          new Date(atual.dataHora).getTime() <= agora.getTime() ||
          new Date(atual.dataHora).getTime() > new Date(limite).getTime()
        ) {
          return;
        }

        const marcado = await tx.orm.public.Agendamento.where({
          id: atual.id,
          status: atual.status,
          dataHora: atual.dataHora,
          lembrete24hEnviadoEm: null,
        }).update({ lembrete24hEnviadoEm: agoraIso });
        if (!marcado) {
          return;
        }

        const massagem = atual.massagemId
          ? await tx.orm.public.Massagem.first({ id: atual.massagemId })
          : null;
        const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
          timeZone:
            this.config.get<string>('AGENDAMENTO_FUSO_HORARIO') ??
            'America/Cuiaba',
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(atual.dataHora));
        const usuarioIds = [atual.usuarioId, atual.massagistaId].filter(
          (id): id is number => id !== null,
        );
        await criarNotificacoes(tx, {
          agendamentoId: atual.id,
          chaveEvento: `lembrete-24h:${atual.id}:${atual.dataHora}`,
          tipo: 'LEMBRETE_24H',
          titulo: 'Lembrete de atendimento',
          mensagem: `Seu atendimento${massagem ? ` de ${massagem.nome}` : ''} está marcado para ${dataFormatada}.`,
          usuarioIds,
        });
      });
    }
  }
}
