import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db';

@Injectable()
export class NotificacoesService {
  async listar(usuarioId: number, page = 1, limit = 20) {
    const resultados = await db.orm.public.Notificacao.where({ usuarioId })
      .select(
        'id',
        'agendamentoId',
        'tipo',
        'titulo',
        'mensagem',
        'lidaEm',
        'emailStatus',
        'createdAt',
      )
      .orderBy([
        (notificacao) => notificacao.createdAt.desc(),
        (notificacao) => notificacao.id.desc(),
      ])
      .offset((page - 1) * limit)
      .limit(limit + 1)
      .all();

    return {
      data: resultados.slice(0, limit),
      pagination: {
        page,
        limit,
        hasMore: resultados.length > limit,
      },
    };
  }

  async marcarComoLida(usuarioId: number, notificacaoId: number) {
    const lidaEm = new Date().toISOString();
    const atualizada = await db.orm.public.Notificacao.where({
      id: notificacaoId,
      usuarioId,
    }).update({ lidaEm });
    if (!atualizada) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    return { id: notificacaoId, lidaEm };
  }
}
