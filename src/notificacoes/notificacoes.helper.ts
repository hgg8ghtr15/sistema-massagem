import { db } from '../prisma/db';

type ContextoTransacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CriarNotificacoesInput {
  agendamentoId: number;
  historicoId?: number;
  chaveEvento: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  usuarioIds: number[];
}

export async function criarNotificacoes(
  tx: ContextoTransacao,
  entrada: CriarNotificacoesInput,
): Promise<void> {
  const usuarios = [...new Set(entrada.usuarioIds)];
  const agora = new Date().toISOString();
  for (const usuarioId of usuarios) {
    await tx.orm.public.Notificacao.create({
      usuarioId,
      agendamentoId: entrada.agendamentoId,
      historicoId: entrada.historicoId ?? null,
      chaveUnica: `${entrada.chaveEvento}:${usuarioId}`,
      tipo: entrada.tipo,
      titulo: entrada.titulo,
      mensagem: entrada.mensagem,
      emailStatus: 'PENDENTE',
      emailTentativas: 0,
      emailProximaTentativaEm: agora,
    });
  }
}
