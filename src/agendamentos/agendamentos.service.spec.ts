import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '../prisma/db';
import { Perfil } from '../usuarios/perfil.enum';
import {
  AgendamentosService,
  type UsuarioAgendamento,
} from './agendamentos.service';
import {
  StatusAgendamento,
  StatusSolicitacaoReagendamento,
} from './agendamento-status.enum';

const DATA_BASE = '2040-01-03T10:00:00-04:00';

function diaDaSemana(dataHora: string): number {
  const dia = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Cuiaba',
    weekday: 'short',
  }).format(new Date(dataHora));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dia);
}

function dataAlinhadaApos(minutos: number): string {
  const meiaHora = 30 * 60_000;
  const horario =
    Math.ceil((Date.now() + minutos * 60_000) / meiaHora) * meiaHora;
  return new Date(horario).toISOString();
}

describe('AgendamentosService', () => {
  let service: AgendamentosService;
  let cliente: UsuarioAgendamento;
  let outroCliente: UsuarioAgendamento;
  let massagista: UsuarioAgendamento;
  let outroMassagista: UsuarioAgendamento;
  let administrativo: UsuarioAgendamento;
  let massagemId: number;
  let diaBase: number;
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const usuarioDoTeste = async (nome: string, perfil: Perfil) => {
    return db.orm.public.Usuario.create({
      email: `${nome.toLowerCase()}-${sufixo}@example.invalid`,
      nome,
      senha: 'senha-de-teste',
      perfis: [perfil],
    });
  };

  async function limparAgendamentos() {
    await db.transaction(async (tx) => {
      await tx.orm.public.Agendamento.where({ usuarioId: cliente.id }).delete();
      await tx.orm.public.Agendamento.where({
        usuarioId: massagista.id,
      }).delete();
      await tx.orm.public.BloqueioMassagista.where({
        usuarioId: massagista.id,
      }).delete();
    });
  }

  async function criarAgendamento(dataHora = DATA_BASE) {
    return service.criar(cliente, {
      massagemId,
      massagistaId: massagista.id,
      dataHora,
    });
  }

  beforeAll(async () => {
    service = new AgendamentosService(
      new ConfigService({
        AGENDAMENTO_FUSO_HORARIO: 'America/Cuiaba',
        AGENDAMENTO_ANTECEDENCIA_MINIMA_MINUTOS: '120',
        AGENDAMENTO_ANTECEDENCIA_CANCELAMENTO_MINUTOS: '240',
        AGENDAMENTO_INTERVALO_MINUTOS: '10',
        AGENDAMENTO_GRANULARIDADE_MINUTOS: '30',
      }),
    );

    const clienteCriado = await usuarioDoTeste(
      `Cliente-${sufixo}`,
      Perfil.CLIENTE,
    );
    const outroClienteCriado = await usuarioDoTeste(
      `Outro-${sufixo}`,
      Perfil.CLIENTE,
    );
    const massagistaCriada = await usuarioDoTeste(
      `Massagista-${sufixo}`,
      Perfil.MASSAGISTA,
    );
    const outroMassagistaCriado = await usuarioDoTeste(
      `Outro-massagista-${sufixo}`,
      Perfil.MASSAGISTA,
    );
    const administrativoCriado = await usuarioDoTeste(
      `Administrativo-${sufixo}`,
      Perfil.ADMINISTRATIVO,
    );
    cliente = { id: clienteCriado.id, perfis: clienteCriado.perfis };
    outroCliente = {
      id: outroClienteCriado.id,
      perfis: outroClienteCriado.perfis,
    };
    massagista = { id: massagistaCriada.id, perfis: massagistaCriada.perfis };
    outroMassagista = {
      id: outroMassagistaCriado.id,
      perfis: outroMassagistaCriado.perfis,
    };
    administrativo = {
      id: administrativoCriado.id,
      perfis: administrativoCriado.perfis,
    };

    const massagem = await db.orm.public.Massagem.create({
      nome: `Massagem teste ${sufixo}`,
      descricao: 'Massagem criada pelos testes de agendamento.',
      duracaoMinutos: 60,
      valorCentavos: 10000,
      ativo: true,
    });
    massagemId = massagem.id;
    diaBase = diaDaSemana(DATA_BASE);

    await db.orm.public.MassagistaMassagem.create({
      usuarioId: massagista.id,
      massagemId,
    });
    await db.orm.public.MassagistaMassagem.create({
      usuarioId: outroMassagista.id,
      massagemId,
    });
    for (let diaSemana = 0; diaSemana <= 6; diaSemana += 1) {
      await db.orm.public.HorarioTrabalho.create({
        usuarioId: massagista.id,
        diaSemana,
        inicio: '00:00',
        fim: '23:59',
      });
      await db.orm.public.HorarioTrabalho.create({
        usuarioId: outroMassagista.id,
        diaSemana,
        inicio: '00:00',
        fim: '23:59',
      });
    }
  });

  beforeEach(async () => {
    await limparAgendamentos();
    await db.orm.public.HorarioTrabalho.where({
      usuarioId: massagista.id,
      diaSemana: diaBase,
    }).update({ inicio: '00:00', fim: '23:59' });
  });

  afterAll(async () => {
    await limparAgendamentos();
    await db.orm.public.HorarioTrabalho.where({
      usuarioId: massagista.id,
    }).delete();
    await db.orm.public.MassagistaMassagem.where({
      usuarioId: massagista.id,
      massagemId,
    }).delete();
    await db.orm.public.HorarioTrabalho.where({
      usuarioId: outroMassagista.id,
    }).delete();
    await db.orm.public.MassagistaMassagem.where({
      usuarioId: outroMassagista.id,
      massagemId,
    }).delete();
    await db.orm.public.Massagem.where({ id: massagemId }).delete();
    await db.orm.public.Usuario.where({ id: cliente.id }).delete();
    await db.orm.public.Usuario.where({ id: outroCliente.id }).delete();
    await db.orm.public.Usuario.where({ id: massagista.id }).delete();
    await db.orm.public.Usuario.where({ id: outroMassagista.id }).delete();
    await db.orm.public.Usuario.where({ id: administrativo.id }).delete();
  });

  it('cria agendamento pendente, calcula o término pela duração e grava histórico', async () => {
    const agendamento = await criarAgendamento();

    expect(agendamento.status).toBe(StatusAgendamento.PENDENTE);
    expect(
      new Date(agendamento.dataHoraFim!).getTime() -
        new Date(agendamento.dataHora).getTime(),
    ).toBe(60 * 60_000);

    const historico = await db.orm.public.AgendamentoHistorico.where({
      agendamentoId: agendamento.id,
    }).all();
    expect(historico).toHaveLength(1);
    expect(historico[0].acao).toBe('CRIADO');
  });

  it('lista os agendamentos próprios do massagista mesmo quando outro profissional atende', async () => {
    const agendamento = await service.criar(massagista, {
      massagemId,
      massagistaId: outroMassagista.id,
      dataHora: DATA_BASE,
    });

    const resposta = await service.listar(massagista, {
      clienteId: massagista.id,
      page: 1,
      limit: 20,
    });

    expect(resposta.data.map((item) => item.id)).toContain(agendamento.id);
  });

  it('retorna opções mínimas dos filtros somente para gestores', async () => {
    const opcoes = await service.opcoesFiltro(administrativo);
    const clienteEncontrado = opcoes.clientes.find((item) => item.id === cliente.id);
    const massagistaEncontrado = opcoes.massagistas.find(
      (item) => item.id === massagista.id,
    );

    expect(clienteEncontrado).toEqual({ id: cliente.id, nome: expect.any(String) });
    expect(massagistaEncontrado).toEqual({
      id: massagista.id,
      nome: expect.any(String),
    });
    expect(clienteEncontrado).not.toHaveProperty('email');
    await expect(service.opcoesFiltro(cliente)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('valida granularidade, antecedência, expediente, bloqueios e horários ocupados', async () => {
    const granularidade = await service.validarDisponibilidade({
      dataHora: '2040-01-03T10:15:00-04:00',
      massagemId,
      massagistaId: massagista.id,
    });
    expect(granularidade.motivo).toContain('intervalos de 30 minutos');

    const antecedencia = new AgendamentosService(
      new ConfigService({
        AGENDAMENTO_ANTECEDENCIA_MINIMA_MINUTOS: '100000000',
      }),
    );
    const insuficiente = await antecedencia.validarDisponibilidade({
      dataHora: DATA_BASE,
      massagemId,
      massagistaId: massagista.id,
    });
    expect(insuficiente.motivo).toContain('antecedência');

    await db.orm.public.HorarioTrabalho.where({
      usuarioId: massagista.id,
      diaSemana: diaBase,
    }).update({ inicio: '12:00', fim: '13:00' });
    const foraDoExpediente = await service.validarDisponibilidade({
      dataHora: DATA_BASE,
      massagemId,
      massagistaId: massagista.id,
    });
    expect(foraDoExpediente.motivo).toContain('fora do horário de trabalho');

    await db.orm.public.HorarioTrabalho.where({
      usuarioId: massagista.id,
      diaSemana: diaBase,
    }).update({ inicio: '00:00', fim: '23:59' });
    await db.orm.public.BloqueioMassagista.create({
      usuarioId: massagista.id,
      dataHoraInicio: '2040-01-03T10:30:00-04:00',
      dataHoraFim: '2040-01-03T11:00:00-04:00',
      motivo: 'Folga de teste',
    });
    const bloqueado = await service.validarDisponibilidade({
      dataHora: DATA_BASE,
      massagemId,
      massagistaId: massagista.id,
    });
    expect(bloqueado.motivo).toContain('bloqueada');

    await db.orm.public.BloqueioMassagista.where({
      usuarioId: massagista.id,
    }).delete();
    await criarAgendamento();
    const ocupado = await service.validarDisponibilidade({
      dataHora: DATA_BASE,
      massagemId,
      massagistaId: massagista.id,
    });
    expect(ocupado.motivo).toContain('ocupado');
  });

  it('confirma uma vez e rejeita uma transição de status inválida', async () => {
    const agendamento = await criarAgendamento();

    const confirmado = await service.confirmar(massagista, agendamento.id);
    expect(confirmado?.status).toBe(StatusAgendamento.CONFIRMADO);
    expect(confirmado?.confirmadoPorId).toBe(massagista.id);
    await expect(
      service.confirmar(massagista, agendamento.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('restringe confirmação e solicitação ao perfil e ao proprietário corretos', async () => {
    const agendamento = await criarAgendamento();

    await expect(
      service.confirmar(cliente, agendamento.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.solicitarReagendamento(
        outroCliente,
        agendamento.id,
        '2040-01-03T12:00:00-04:00',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.reagendarDiretamente(
        cliente,
        agendamento.id,
        '2040-01-03T12:00:00-04:00',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('recusa solicitação de reagendamento e restaura o status anterior', async () => {
    const agendamento = await criarAgendamento();
    await service.confirmar(massagista, agendamento.id);
    const solicitacao = await service.solicitarReagendamento(
      cliente,
      agendamento.id,
      '2040-01-03T12:00:00-04:00',
      'Compromisso pessoal',
    );

    const recusado = await service.responderSolicitacaoReagendamento(
      administrativo,
      solicitacao.id,
      false,
    );
    expect(recusado?.status).toBe(StatusAgendamento.CONFIRMADO);

    const salvo = await db.orm.public.SolicitacaoReagendamento.first({
      id: solicitacao.id,
    });
    expect(salvo?.status).toBe(StatusSolicitacaoReagendamento.RECUSADA);
    expect(salvo?.statusAnterior).toBe(StatusAgendamento.CONFIRMADO);
  });

  it('aprova reagendamento validando disponibilidade e recalculando o término', async () => {
    const agendamento = await criarAgendamento();
    const solicitacao = await service.solicitarReagendamento(
      cliente,
      agendamento.id,
      '2040-01-03T12:00:00-04:00',
    );

    const reagendado = await service.responderSolicitacaoReagendamento(
      administrativo,
      solicitacao.id,
      true,
    );
    expect(reagendado?.status).toBe(StatusAgendamento.REAGENDADO);
    expect(
      new Date(reagendado!.dataHoraFim!).getTime() -
        new Date(reagendado!.dataHora).getTime(),
    ).toBe(60 * 60_000);

    const salvo = await db.orm.public.SolicitacaoReagendamento.first({
      id: solicitacao.id,
    });
    expect(salvo?.status).toBe(StatusSolicitacaoReagendamento.APROVADA);
    expect(salvo?.respondidoPorId).toBe(administrativo.id);
  });

  it('permite reagendamento direto somente a gestores e registra a alteração', async () => {
    const agendamento = await criarAgendamento();
    const reagendado = await service.reagendarDiretamente(
      administrativo,
      agendamento.id,
      '2040-01-03T12:00:00-04:00',
    );

    expect(reagendado?.status).toBe(StatusAgendamento.REAGENDADO);
    const historico = await db.orm.public.AgendamentoHistorico.where({
      agendamentoId: agendamento.id,
    }).all();
    expect(historico.map((item) => item.acao)).toContain(
      'REAGENDADO_DIRETAMENTE',
    );
  });

  it('aplica a antecedência mínima de cancelamento do cliente', async () => {
    const agendamento = await criarAgendamento(dataAlinhadaApos(180));

    await expect(
      service.cancelar(cliente, agendamento.id),
    ).rejects.toBeInstanceOf(BadRequestException);
    const cancelado = await service.cancelar(
      administrativo,
      agendamento.id,
      'A pedido do cliente',
    );
    expect(cancelado?.status).toBe(StatusAgendamento.CANCELADO);
  });

  it('permite apenas uma criação quando duas requisições disputam o mesmo horário', async () => {
    const entrada = {
      massagemId,
      massagistaId: massagista.id,
      dataHora: DATA_BASE,
    };
    const dataHoraFim = new Date(
      new Date(DATA_BASE).getTime() + 60 * 60_000,
    ).toISOString();
    const disponibilidade = jest
      .spyOn(service, 'validarDisponibilidade')
      .mockResolvedValue({ disponivel: true, dataHoraFim });
    const resultados = await Promise.allSettled([
      service.criar(cliente, entrada),
      service.criar(cliente, entrada),
    ]);
    disponibilidade.mockRestore();

    expect(
      resultados.filter((resultado) => resultado.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejeitados = resultados.filter(
      (resultado): resultado is PromiseRejectedResult =>
        resultado.status === 'rejected',
    );
    expect(rejeitados).toHaveLength(1);
    expect(rejeitados[0].reason).toBeInstanceOf(ConflictException);
  });
});
