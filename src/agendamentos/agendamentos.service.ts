import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '../prisma/db';
import { and, or } from '@prisma/orm-family-sql/orm-client';
import { criarNotificacoes } from '../notificacoes/notificacoes.helper';
import { Perfil } from '../usuarios/perfil.enum';
import {
  StatusAgendamento,
  StatusSolicitacaoReagendamento,
} from './agendamento-status.enum';

const STATUS_ATIVOS = [
  StatusAgendamento.PENDENTE,
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.REAGENDAMENTO_SOLICITADO,
  StatusAgendamento.REAGENDADO,
];

const STATUS_CANCELAVEIS = [
  StatusAgendamento.PENDENTE,
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.REAGENDAMENTO_SOLICITADO,
  StatusAgendamento.REAGENDADO,
];

const STATUS_FINALIZAVEIS = [
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.REAGENDADO,
];

const STATUS_REAGENDAVEIS_DIRETAMENTE = [
  StatusAgendamento.PENDENTE,
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.REAGENDADO,
];

export interface UsuarioAgendamento {
  id: number;
  perfis?: string[] | null;
}

export interface CriarAgendamentoInput {
  dataHora: Date | string;
  massagemId: number;
  massagistaId?: number;
  clienteId?: number;
  observacoes?: string;
}

export interface ValidarDisponibilidadeInput {
  dataHora: Date | string;
  massagemId: number;
  massagistaId: number;
  ignorarAgendamentoId?: number;
}

export interface ResultadoDisponibilidade {
  disponivel: boolean;
  motivo?: string;
  dataHoraFim?: string;
}

export interface FiltrosAgendamentos {
  data?: string;
  massagistaId?: number;
  clienteId?: number;
  status?: StatusAgendamento;
  page?: number;
  limit?: number;
}

export interface FiltrosSolicitacoes {
  status?: StatusSolicitacaoReagendamento;
  page?: number;
  limit?: number;
}

export interface FiltroHorariosLivres {
  data: string;
  massagemId: number;
  massagistaId?: number;
}

interface ConfiguracaoAgendamentos {
  fusoHorario: string;
  antecedenciaMinimaMinutos: number;
  antecedenciaCancelamentoMinutos: number;
  intervaloAtendimentosMinutos: number;
  granularidadeMinutos: number;
}

type ContextoTransacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface IntervaloAgendamento {
  dataHora: string;
  dataHoraFim: string | null;
  massagistaId: number | null;
  massagemId: number | null;
  usuarioId: number;
  status: string;
  confirmadoPorId: number | null;
  confirmadoEm: string | null;
  observacoes: string | null;
  id: number;
}

interface DadosHistorico {
  [campo: string]: string | number | null;
  status: string;
  dataHora: string;
  dataHoraFim: string | null;
  massagistaId: number | null;
  massagemId: number | null;
  confirmadoPorId: number | null;
  confirmadoEm: string | null;
  observacoes: string | null;
}

interface CamposDataLocal {
  data: string;
  diaSemana: number;
  minuto: number;
  hora: number;
}

function perfisDo(usuario: UsuarioAgendamento): string[] {
  return usuario.perfis ?? [];
}

function erroPostgres(
  error: unknown,
  code: string,
  constraint?: string,
): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const codigoCompativel =
    ('code' in error && error.code === code) ||
    ('sqlState' in error && error.sqlState === code);
  if (!codigoCompativel) {
    return 'cause' in error && erroPostgres(error.cause, code, constraint);
  }

  if (!constraint) {
    return true;
  }

  return 'constraint' in error && error.constraint === constraint;
}

function paraIso(data: Date | string): string | null {
  const parsed = data instanceof Date ? data : new Date(data);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function camposLocais(dataIso: string, fusoHorario: string): CamposDataLocal {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(dataIso));
  const valores = Object.fromEntries(
    partes.map(({ type, value }) => [type, value]),
  );
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const diaSemana = dias.indexOf(valores.weekday);

  if (diaSemana < 0) {
    throw new InternalServerErrorException(
      'Não foi possível interpretar o dia do agendamento.',
    );
  }

  const hora = Number(valores.hour);
  const minuto = Number(valores.minute);

  return {
    data: `${valores.year}-${valores.month}-${valores.day}`,
    diaSemana,
    minuto: hora * 60 + minuto,
    hora,
  };
}

function minutosDoRelogio(horario: string): number | null {
  const correspondencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(horario);
  if (!correspondencia) {
    return null;
  }

  return Number(correspondencia[1]) * 60 + Number(correspondencia[2]);
}

function proximoDia(data: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return null;
  }
  const dia = new Date(`${data}T00:00:00.000Z`);
  if (Number.isNaN(dia.getTime()) || dia.toISOString().slice(0, 10) !== data) {
    return null;
  }
  dia.setUTCDate(dia.getUTCDate() + 1);
  return dia.toISOString().slice(0, 10);
}

function dataHoraLocalParaIso(
  data: string,
  minuto: number,
  fusoHorario: string,
): string | null {
  const seguinte = proximoDia(data);
  if (!seguinte || minuto < 0 || minuto >= 1440) {
    return null;
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const desejado = Date.UTC(
    ano,
    mes - 1,
    dia,
    Math.floor(minuto / 60),
    minuto % 60,
  );
  let instante = desejado;

  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const campos = camposLocais(
      new Date(instante).toISOString(),
      fusoHorario,
    );
    const [anoLocal, mesLocal, diaLocal] = campos.data.split('-').map(Number);
    const localObservado = Date.UTC(
      anoLocal,
      mesLocal - 1,
      diaLocal,
      campos.hora,
      campos.minuto % 60,
    );
    const diferenca = desejado - localObservado;
    if (diferenca === 0) {
      return new Date(instante).toISOString();
    }
    instante += diferenca;
  }

  return null;
}

function lerConfiguracaoInteira(
  config: ConfigService,
  chave: string,
  padrao: number,
  minimo: number,
): number {
  const valor = config.get<string>(chave);
  if (valor === undefined || valor.trim() === '') {
    return padrao;
  }

  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < minimo) {
    throw new InternalServerErrorException(
      `A configuração ${chave} deve ser um número inteiro maior ou igual a ${minimo}.`,
    );
  }

  return numero;
}

@Injectable()
export class AgendamentosService {
  private readonly configuracao: ConfiguracaoAgendamentos;

  constructor(config: ConfigService) {
    const fusoHorario =
      config.get<string>('AGENDAMENTO_FUSO_HORARIO') ?? 'America/Cuiaba';

    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone: fusoHorario }).format(
        new Date(),
      );
    } catch (error) {
      if (error instanceof RangeError) {
        throw new InternalServerErrorException(
          'A configuração AGENDAMENTO_FUSO_HORARIO não é um fuso horário válido.',
        );
      }
      throw error;
    }

    this.configuracao = {
      fusoHorario,
      antecedenciaMinimaMinutos: lerConfiguracaoInteira(
        config,
        'AGENDAMENTO_ANTECEDENCIA_MINIMA_MINUTOS',
        120,
        0,
      ),
      antecedenciaCancelamentoMinutos: lerConfiguracaoInteira(
        config,
        'AGENDAMENTO_ANTECEDENCIA_CANCELAMENTO_MINUTOS',
        240,
        0,
      ),
      intervaloAtendimentosMinutos: lerConfiguracaoInteira(
        config,
        'AGENDAMENTO_INTERVALO_MINUTOS',
        10,
        0,
      ),
      granularidadeMinutos: lerConfiguracaoInteira(
        config,
        'AGENDAMENTO_GRANULARIDADE_MINUTOS',
        30,
        1,
      ),
    };
  }

  async listar(usuario: UsuarioAgendamento, filtros: FiltrosAgendamentos) {
    const gestor = this.podeGerenciarTudo(usuario);
    const eCliente = perfisDo(usuario).includes(Perfil.CLIENTE);
    const eMassagista = perfisDo(usuario).includes(Perfil.MASSAGISTA);
    if (!gestor && !eCliente && !eMassagista) {
      throw new ForbiddenException(
        'Seu perfil não pode consultar agendamentos.',
      );
    }

    let consulta = db.orm.public.Agendamento.where((agendamento) => {
      if (gestor) {
        return agendamento.id.gte(0);
      }
      if (eCliente && eMassagista) {
        return or(
          agendamento.usuarioId.eq(usuario.id),
          agendamento.massagistaId.eq(usuario.id),
        );
      }
      if (eMassagista) {
        return or(
          agendamento.usuarioId.eq(usuario.id),
          agendamento.massagistaId.eq(usuario.id),
        );
      }
      return agendamento.usuarioId.eq(usuario.id);
    });

    if (filtros.clienteId !== undefined) {
      consulta = consulta.where({ usuarioId: filtros.clienteId });
    }
    if (filtros.massagistaId !== undefined) {
      consulta = consulta.where({ massagistaId: filtros.massagistaId });
    }
    if (filtros.status) {
      consulta = consulta.where({ status: filtros.status });
    }
    if (filtros.data) {
      const inicio = dataHoraLocalParaIso(
        filtros.data,
        0,
        this.configuracao.fusoHorario,
      );
      const proximo = proximoDia(filtros.data);
      const fim = proximo
        ? dataHoraLocalParaIso(proximo, 0, this.configuracao.fusoHorario)
        : null;
      if (!inicio || !fim) {
        throw new BadRequestException('A data informada é inválida.');
      }
      consulta = consulta.where((agendamento) =>
        and(
          agendamento.dataHora.gte(inicio),
          agendamento.dataHora.lt(fim),
        ),
      );
    }

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const resultados = await consulta
      .include('usuario', (cliente) => cliente.select('id', 'nome', 'email'))
      .include('massagista', (massagista) =>
        massagista.select('id', 'nome', 'email'),
      )
      .include('massagem', (massagem) =>
        massagem.select('id', 'nome', 'duracaoMinutos', 'valorCentavos'),
      )
      .orderBy([
        (agendamento) => agendamento.dataHora.asc(),
        (agendamento) => agendamento.id.asc(),
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

  async opcoesFiltro(usuario: UsuarioAgendamento) {
    this.exigirGestor(usuario);
    const usuarios = await db.orm.public.Usuario
      .select('id', 'nome', 'perfis')
      .all();

    const porPerfil = (perfil: Perfil) =>
      usuarios
        .filter((item) => item.perfis?.includes(perfil))
        .map(({ id, nome }) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return {
      clientes: porPerfil(Perfil.CLIENTE),
      massagistas: porPerfil(Perfil.MASSAGISTA),
    };
  }

  async detalhar(usuario: UsuarioAgendamento, agendamentoId: number) {
    const agendamento = await this.buscarAgendamento(agendamentoId);
    this.exigirAcessoLeitura(usuario, agendamento);

    return db.orm.public.Agendamento.where({ id: agendamentoId })
      .include('usuario', (cliente) => cliente.select('id', 'nome', 'email'))
      .include('massagista', (massagista) =>
        massagista.select('id', 'nome', 'email'),
      )
      .include('massagem', (massagem) =>
        massagem.select('id', 'nome', 'duracaoMinutos', 'valorCentavos'),
      )
      .include('solicitacoes', (solicitacoes) =>
        solicitacoes
          .include('respondidoPor', (respondedor) =>
            respondedor.select('id', 'nome', 'email'),
          )
          .orderBy((solicitacao) => solicitacao.createdAt.desc()),
      )
      .include('historico', (historicos) =>
        historicos
          .include('autor', (autor) => autor.select('id', 'nome', 'email'))
          .orderBy((historico) => historico.createdAt.desc()),
      )
      .first();
  }

  async listarSolicitacoes(
    usuario: UsuarioAgendamento,
    filtros: FiltrosSolicitacoes,
  ) {
    const gestor = this.podeGerenciarTudo(usuario);
    let consulta = db.orm.public.SolicitacaoReagendamento.where((solicitacao) =>
      solicitacao.id.gte(0),
    );

    if (!gestor) {
      if (!perfisDo(usuario).includes(Perfil.CLIENTE)) {
        throw new ForbiddenException(
          'Seu perfil não pode consultar solicitações de reagendamento.',
        );
      }
      const agendamentos = await db.orm.public.Agendamento.where({
        usuarioId: usuario.id,
      }).all();
      const agendamentoIds = agendamentos.map((agendamento) => agendamento.id);
      if (agendamentoIds.length === 0) {
        return {
          data: [],
          pagination: {
            page: filtros.page ?? 1,
            limit: filtros.limit ?? 20,
            hasMore: false,
          },
        };
      }
      consulta = consulta.where((solicitacao) =>
        solicitacao.agendamentoId.in(agendamentoIds),
      );
    }
    if (filtros.status) {
      consulta = consulta.where({ status: filtros.status });
    }

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;
    const resultados = await consulta
      .include('agendamento', (agendamento) =>
        agendamento
          .include('usuario', (cliente) =>
            cliente.select('id', 'nome', 'email'),
          )
          .include('massagista', (massagista) =>
            massagista.select('id', 'nome', 'email'),
          )
          .include('massagem', (massagem) =>
            massagem.select('id', 'nome', 'duracaoMinutos'),
          ),
      )
      .include('respondidoPor', (respondedor) =>
        respondedor.select('id', 'nome', 'email'),
      )
      .orderBy([
        (solicitacao) => solicitacao.createdAt.desc(),
        (solicitacao) => solicitacao.id.desc(),
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

  async horariosLivres(entrada: FiltroHorariosLivres) {
    if (!proximoDia(entrada.data)) {
      throw new BadRequestException('A data informada é inválida.');
    }
    const massagistas = await this.buscarMassagistas(
      entrada.massagemId,
      entrada.massagistaId,
    );
    const horarios: {
      dataHora: string;
      dataHoraFim: string;
      massagistaIds: number[];
    }[] = [];

    for (
      let minuto = 0;
      minuto < 1440;
      minuto += this.configuracao.granularidadeMinutos
    ) {
      const dataHora = dataHoraLocalParaIso(
        entrada.data,
        minuto,
        this.configuracao.fusoHorario,
      );
      if (!dataHora) {
        continue;
      }

      let dataHoraFim: string | undefined;
      const massagistaIds: number[] = [];
      for (const massagista of massagistas) {
        const resultado = await this.validarDisponibilidade({
          dataHora,
          massagemId: entrada.massagemId,
          massagistaId: massagista.id,
        });
        if (resultado.disponivel && resultado.dataHoraFim) {
          dataHoraFim = resultado.dataHoraFim;
          massagistaIds.push(massagista.id);
        }
      }
      if (dataHoraFim) {
        horarios.push({ dataHora, dataHoraFim, massagistaIds });
      }
    }

    return { data: entrada.data, massagemId: entrada.massagemId, horarios };
  }

  async validarDisponibilidade(
    entrada: ValidarDisponibilidadeInput,
  ): Promise<ResultadoDisponibilidade> {
    const inicio = paraIso(entrada.dataHora);
    if (!inicio) {
      return {
        disponivel: false,
        motivo: 'A data e o horário informados são inválidos.',
      };
    }

    const agora = Date.now();
    const instanteInicio = new Date(inicio).getTime();
    const antecedenciaMinimaMs =
      this.configuracao.antecedenciaMinimaMinutos * 60_000;

    if (instanteInicio < agora + antecedenciaMinimaMs) {
      return {
        disponivel: false,
        motivo: `O agendamento precisa ser feito com pelo menos ${this.configuracao.antecedenciaMinimaMinutos} minutos de antecedência.`,
      };
    }

    const inicioLocal = camposLocais(inicio, this.configuracao.fusoHorario);
    const segundo = new Date(inicio).getUTCSeconds();
    const milissegundo = new Date(inicio).getUTCMilliseconds();
    if (
      inicioLocal.minuto % this.configuracao.granularidadeMinutos !== 0 ||
      segundo !== 0 ||
      milissegundo !== 0
    ) {
      return {
        disponivel: false,
        motivo: `Os horários devem respeitar intervalos de ${this.configuracao.granularidadeMinutos} minutos.`,
      };
    }

    const massagem = await db.orm.public.Massagem.first({
      id: entrada.massagemId,
    });
    if (!massagem || !massagem.ativo) {
      throw new NotFoundException('Massagem ativa não encontrada.');
    }

    const massagista = await db.orm.public.Usuario.first({
      id: entrada.massagistaId,
    });
    if (!massagista?.perfis?.includes(Perfil.MASSAGISTA)) {
      throw new NotFoundException('Massagista não encontrada.');
    }

    const vinculo = await db.orm.public.MassagistaMassagem.where({
      usuarioId: entrada.massagistaId,
      massagemId: entrada.massagemId,
    }).first();
    if (!vinculo) {
      return {
        disponivel: false,
        motivo: 'A massagista selecionada não realiza esse tipo de massagem.',
      };
    }

    const fim = new Date(
      instanteInicio + massagem.duracaoMinutos * 60_000,
    ).toISOString();
    const instanteFim = new Date(fim).getTime();
    const fimLocal = camposLocais(fim, this.configuracao.fusoHorario);
    if (fimLocal.data !== inicioLocal.data) {
      return {
        disponivel: false,
        motivo:
          'O atendimento precisa terminar no mesmo dia e dentro do expediente.',
      };
    }

    const horarios = await db.orm.public.HorarioTrabalho.where({
      usuarioId: entrada.massagistaId,
      diaSemana: inicioLocal.diaSemana,
    }).all();
    const fimEmMinutos = fimLocal.minuto;
    const estaNoExpediente = horarios.some((horario) => {
      const inicioExpediente = minutosDoRelogio(horario.inicio);
      const fimExpediente = minutosDoRelogio(horario.fim);
      return (
        inicioExpediente !== null &&
        fimExpediente !== null &&
        inicioExpediente < fimExpediente &&
        inicioLocal.minuto >= inicioExpediente &&
        fimEmMinutos <= fimExpediente
      );
    });
    if (!estaNoExpediente) {
      return {
        disponivel: false,
        motivo:
          'O intervalo completo está fora do horário de trabalho da massagista.',
      };
    }

    const bloqueios = await db.orm.public.BloqueioMassagista.where({
      usuarioId: entrada.massagistaId,
    })
      .where((bloqueio) => bloqueio.dataHoraInicio.lt(fim))
      .all();
    if (
      bloqueios.some((bloqueio) => {
        return (
          new Date(bloqueio.dataHoraInicio).getTime() <
            new Date(fim).getTime() &&
          new Date(bloqueio.dataHoraFim).getTime() > new Date(inicio).getTime()
        );
      })
    ) {
      return {
        disponivel: false,
        motivo: 'A massagista está bloqueada nesse período.',
      };
    }

    const bufferMs = this.configuracao.intervaloAtendimentosMinutos * 60_000;
    const inicioComBuffer = new Date(
      instanteInicio - this.configuracao.intervaloAtendimentosMinutos * 60_000,
    ).toISOString();
    const fimComBuffer = new Date(instanteFim + bufferMs).toISOString();
    const atendimentos = await db.orm.public.Agendamento.where({
      massagistaId: entrada.massagistaId,
    })
      .where((agendamento) => agendamento.dataHora.lt(fimComBuffer))
      .where((agendamento) => agendamento.dataHoraFim.gt(inicioComBuffer))
      .where((agendamento) => agendamento.status.in(STATUS_ATIVOS))
      .all();
    const conflito = atendimentos.some((agendamento) => {
      if (
        !agendamento.dataHoraFim ||
        agendamento.id === entrada.ignorarAgendamentoId
      ) {
        return false;
      }

      const inicioExistente = new Date(agendamento.dataHora).getTime();
      const fimExistente = new Date(agendamento.dataHoraFim).getTime();
      return (
        instanteInicio < fimExistente + bufferMs &&
        instanteFim + bufferMs > inicioExistente
      );
    });

    if (conflito) {
      return {
        disponivel: false,
        motivo:
          'Esse horário está ocupado ou não respeita o intervalo entre atendimentos.',
      };
    }

    return { disponivel: true, dataHoraFim: fim };
  }

  async criar(usuario: UsuarioAgendamento, entrada: CriarAgendamentoInput) {
    this.exigirPerfil(usuario, [
      Perfil.CLIENTE,
      Perfil.MASSAGISTA,
      Perfil.ADMINISTRATIVO,
      Perfil.ADMIN,
    ]);

    const clienteId = entrada.clienteId ?? usuario.id;
    if (clienteId !== usuario.id && !this.podeGerenciarTudo(usuario)) {
      throw new ForbiddenException(
        'Você só pode criar agendamentos para si mesmo.',
      );
    }

    const cliente = await db.orm.public.Usuario.first({ id: clienteId });
    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    const massagem = await db.orm.public.Massagem.first({
      id: entrada.massagemId,
    });
    if (!massagem || !massagem.ativo) {
      throw new NotFoundException('Massagem ativa não encontrada.');
    }

    const inicio = paraIso(entrada.dataHora);
    if (!inicio) {
      throw new BadRequestException(
        'A data e o horário informados são inválidos.',
      );
    }

    const massagistas = await this.buscarMassagistas(
      entrada.massagemId,
      entrada.massagistaId,
    );
    const resultados: ResultadoDisponibilidade[] = [];

    for (const massagista of massagistas) {
      const resultado = await this.validarDisponibilidade({
        dataHora: entrada.dataHora,
        massagemId: entrada.massagemId,
        massagistaId: massagista.id,
      });
      if (resultado.disponivel && resultado.dataHoraFim) {
        return this.criarRegistro(
          usuario.id,
          clienteId,
          massagem.id,
          massagista.id,
          inicio,
          resultado.dataHoraFim,
          entrada.observacoes?.trim() || null,
        );
      }
      resultados.push(resultado);
    }

    const motivos = [
      ...new Set(
        resultados.map((resultado) => resultado.motivo).filter(Boolean),
      ),
    ];
    throw new BadRequestException(
      entrada.massagistaId
        ? (motivos[0] ?? 'O horário não está disponível.')
        : `Nenhuma massagista está disponível nesse horário. ${motivos.join(' ')}`.trim(),
    );
  }

  async confirmar(usuario: UsuarioAgendamento, agendamentoId: number) {
    const agendamento = await this.buscarAgendamento(agendamentoId);
    this.exigirMassagistaOuGestorDoAgendamento(usuario, agendamento);
    this.exigirStatus(agendamento.status, [StatusAgendamento.PENDENTE]);

    const agora = new Date().toISOString();
    return db.transaction(async (tx) => {
      const atualizado = await this.atualizarAgendamentoSeStatus(
        tx,
        agendamentoId,
        StatusAgendamento.PENDENTE,
        {
          status: StatusAgendamento.CONFIRMADO,
          confirmadoPorId: usuario.id,
          confirmadoEm: agora,
        },
      );
      await this.registrarHistorico(
        tx,
        usuario.id,
        agendamentoId,
        'CONFIRMADO',
        this.snapshot(agendamento),
        {
          ...this.snapshot(agendamento),
          status: StatusAgendamento.CONFIRMADO,
          confirmadoPorId: usuario.id,
          confirmadoEm: agora,
        },
      );
      return atualizado;
    });
  }

  async cancelar(
    usuario: UsuarioAgendamento,
    agendamentoId: number,
    motivo?: string,
  ) {
    const agendamento = await this.buscarAgendamento(agendamentoId);
    this.exigirDonoOuGestorOuMassagista(usuario, agendamento);
    this.exigirStatus(agendamento.status, STATUS_CANCELAVEIS);

    if (
      !this.podeGerenciarTudo(usuario) &&
      !(
        perfisDo(usuario).includes(Perfil.MASSAGISTA) &&
        agendamento.massagistaId === usuario.id
      ) &&
      !this.respeitaAntecedenciaCancelamento(agendamento.dataHora)
    ) {
      throw new BadRequestException(
        `O cancelamento deve ser feito com pelo menos ${this.configuracao.antecedenciaCancelamentoMinutos} minutos de antecedência.`,
      );
    }

    return db.transaction(async (tx) => {
      const atualizado = await this.atualizarAgendamentoSeStatus(
        tx,
        agendamentoId,
        agendamento.status,
        { status: StatusAgendamento.CANCELADO },
      );
      await tx.orm.public.SolicitacaoReagendamento.where({
        agendamentoId,
        status: StatusSolicitacaoReagendamento.PENDENTE,
      }).update({
        status: StatusSolicitacaoReagendamento.CANCELADA,
        respondidoPorId: usuario.id,
        respondidoEm: new Date().toISOString(),
      });
      await this.registrarHistorico(
        tx,
        usuario.id,
        agendamentoId,
        'CANCELADO',
        this.snapshot(agendamento),
        {
          ...this.snapshot(agendamento),
          status: StatusAgendamento.CANCELADO,
          motivo: motivo?.trim() || null,
        },
      );
      return atualizado;
    });
  }

  async reagendarDiretamente(
    usuario: UsuarioAgendamento,
    agendamentoId: number,
    dataHora: Date | string,
  ) {
    this.exigirGestor(usuario);
    const agendamento = await this.buscarAgendamento(agendamentoId);
    this.exigirStatus(agendamento.status, STATUS_REAGENDAVEIS_DIRETAMENTE);
    if (agendamento.massagemId === null || agendamento.massagistaId === null) {
      throw new BadRequestException(
        'O agendamento antigo precisa ter massagem e massagista vinculadas antes de ser reagendado.',
      );
    }

    const disponibilidade = await this.validarDisponibilidade({
      dataHora,
      massagemId: agendamento.massagemId,
      massagistaId: agendamento.massagistaId,
      ignorarAgendamentoId: agendamentoId,
    });
    if (!disponibilidade.disponivel || !disponibilidade.dataHoraFim) {
      throw new BadRequestException(disponibilidade.motivo);
    }
    const dataHoraFim = disponibilidade.dataHoraFim;

    return this.aplicarReagendamento(
      usuario.id,
      agendamento,
      paraIso(dataHora)!,
      dataHoraFim,
      'REAGENDADO_DIRETAMENTE',
    );
  }

  async solicitarReagendamento(
    usuario: UsuarioAgendamento,
    agendamentoId: number,
    dataHoraSugerida: Date | string,
    motivo?: string,
  ) {
    this.exigirPerfil(usuario, [Perfil.CLIENTE]);
    const agendamento = await this.buscarAgendamento(agendamentoId);
    if (agendamento.usuarioId !== usuario.id) {
      throw new ForbiddenException(
        'Você só pode solicitar reagendamento dos seus próprios atendimentos.',
      );
    }
    this.exigirStatus(agendamento.status, [
      StatusAgendamento.PENDENTE,
      StatusAgendamento.CONFIRMADO,
      StatusAgendamento.REAGENDADO,
    ]);

    const dataSugerida = paraIso(dataHoraSugerida);
    if (!dataSugerida) {
      throw new BadRequestException(
        'A data e o horário sugeridos são inválidos.',
      );
    }

    if (agendamento.massagemId === null || agendamento.massagistaId === null) {
      throw new BadRequestException(
        'O agendamento antigo precisa ter massagem e massagista vinculadas para solicitar reagendamento.',
      );
    }

    const validacao = await this.validarDisponibilidade({
      dataHora: dataSugerida,
      massagemId: agendamento.massagemId,
      massagistaId: agendamento.massagistaId,
      ignorarAgendamentoId: agendamentoId,
    });
    if (!validacao.disponivel) {
      throw new BadRequestException(validacao.motivo);
    }

    return db.transaction(async (tx) => {
      const solicitacao = await tx.orm.public.SolicitacaoReagendamento.create({
        agendamentoId,
        dataHoraSugerida: dataSugerida,
        motivo: motivo?.trim() || null,
        status: StatusSolicitacaoReagendamento.PENDENTE,
        statusAnterior: agendamento.status,
      });
      await this.atualizarAgendamentoSeStatus(
        tx,
        agendamentoId,
        agendamento.status,
        { status: StatusAgendamento.REAGENDAMENTO_SOLICITADO },
      );
      await this.registrarHistorico(
        tx,
        usuario.id,
        agendamentoId,
        'REAGENDAMENTO_SOLICITADO',
        this.snapshot(agendamento),
        {
          ...this.snapshot(agendamento),
          status: StatusAgendamento.REAGENDAMENTO_SOLICITADO,
          dataHoraSugerida: dataSugerida,
          motivo: motivo?.trim() || null,
        },
      );
      return solicitacao;
    });
  }

  async responderSolicitacaoReagendamento(
    usuario: UsuarioAgendamento,
    solicitacaoId: number,
    aprovar: boolean,
  ) {
    this.exigirGestor(usuario);
    const solicitacao = await db.orm.public.SolicitacaoReagendamento.first({
      id: solicitacaoId,
    });
    if (!solicitacao) {
      throw new NotFoundException(
        'Solicitação de reagendamento não encontrada.',
      );
    }
    if (solicitacao.status !== StatusSolicitacaoReagendamento.PENDENTE) {
      throw new ConflictException('Esta solicitação já foi respondida.');
    }

    const agendamento = await this.buscarAgendamento(solicitacao.agendamentoId);
    this.exigirStatus(agendamento.status, [
      StatusAgendamento.REAGENDAMENTO_SOLICITADO,
    ]);

    if (!aprovar) {
      if (
        !STATUS_REAGENDAVEIS_DIRETAMENTE.some(
          (status) => status === solicitacao.statusAnterior,
        )
      ) {
        throw new ConflictException(
          'O status anterior da solicitação não permite restaurar o agendamento.',
        );
      }

      return db.transaction(async (tx) => {
        const resposta = await tx.orm.public.SolicitacaoReagendamento.where({
          id: solicitacaoId,
          status: StatusSolicitacaoReagendamento.PENDENTE,
        }).update({
          status: StatusSolicitacaoReagendamento.RECUSADA,
          respondidoPorId: usuario.id,
          respondidoEm: new Date().toISOString(),
        });
        if (!resposta) {
          throw new ConflictException('Esta solicitação já foi respondida.');
        }
        const atualizado = await this.atualizarAgendamentoSeStatus(
          tx,
          agendamento.id,
          StatusAgendamento.REAGENDAMENTO_SOLICITADO,
          { status: solicitacao.statusAnterior },
        );
        await this.registrarHistorico(
          tx,
          usuario.id,
          agendamento.id,
          'SOLICITACAO_REAGENDAMENTO_RECUSADA',
          this.snapshot(agendamento),
          {
            ...this.snapshot(agendamento),
            status: solicitacao.statusAnterior,
            solicitacaoId,
          },
        );
        return atualizado;
      });
    }

    if (agendamento.massagemId === null || agendamento.massagistaId === null) {
      throw new BadRequestException(
        'O agendamento antigo precisa ter massagem e massagista vinculadas antes de aprovar o reagendamento.',
      );
    }
    const disponibilidade = await this.validarDisponibilidade({
      dataHora: solicitacao.dataHoraSugerida,
      massagemId: agendamento.massagemId,
      massagistaId: agendamento.massagistaId,
      ignorarAgendamentoId: agendamento.id,
    });
    if (!disponibilidade.disponivel || !disponibilidade.dataHoraFim) {
      throw new BadRequestException(disponibilidade.motivo);
    }
    const dataHoraFim = disponibilidade.dataHoraFim;

    return this.comTratamentoSobreposicao(() =>
      db.transaction(async (tx) => {
        const resposta = await tx.orm.public.SolicitacaoReagendamento.where({
          id: solicitacaoId,
          status: StatusSolicitacaoReagendamento.PENDENTE,
        }).update({
          status: StatusSolicitacaoReagendamento.APROVADA,
          respondidoPorId: usuario.id,
          respondidoEm: new Date().toISOString(),
        });
        if (!resposta) {
          throw new ConflictException('Esta solicitação já foi respondida.');
        }
        const atualizado = await this.atualizarAgendamentoSeStatus(
          tx,
          agendamento.id,
          StatusAgendamento.REAGENDAMENTO_SOLICITADO,
          {
            dataHora: solicitacao.dataHoraSugerida,
            dataHoraFim,
            status: StatusAgendamento.REAGENDADO,
            lembrete24hEnviadoEm: null,
          },
        );
        await this.registrarHistorico(
          tx,
          usuario.id,
          agendamento.id,
          'SOLICITACAO_REAGENDAMENTO_APROVADA',
          this.snapshot(agendamento),
          {
            ...this.snapshot(agendamento),
            dataHora: solicitacao.dataHoraSugerida,
            dataHoraFim,
            status: StatusAgendamento.REAGENDADO,
            solicitacaoId,
          },
        );
        return atualizado;
      }),
    );
  }

  async concluir(usuario: UsuarioAgendamento, agendamentoId: number) {
    return this.finalizar(
      usuario,
      agendamentoId,
      StatusAgendamento.CONCLUIDO,
      'CONCLUIDO',
    );
  }

  async marcarNaoCompareceu(
    usuario: UsuarioAgendamento,
    agendamentoId: number,
  ) {
    return this.finalizar(
      usuario,
      agendamentoId,
      StatusAgendamento.NAO_COMPARECEU,
      'NAO_COMPARECEU',
    );
  }

  private async criarRegistro(
    autorId: number,
    clienteId: number,
    massagemId: number,
    massagistaId: number,
    dataHora: string,
    dataHoraFim: string,
    observacoes: string | null,
  ) {
    return this.comTratamentoSobreposicao(() =>
      db.transaction(async (tx) => {
        const agendamento = await tx.orm.public.Agendamento.create({
          usuarioId: clienteId,
          massagemId,
          massagistaId,
          dataHora,
          dataHoraFim,
          status: StatusAgendamento.PENDENTE,
          observacoes,
        });
        await this.registrarHistorico(
          tx,
          autorId,
          agendamento.id,
          'CRIADO',
          null,
          this.snapshot(agendamento),
        );
        return agendamento;
      }),
    );
  }

  private async buscarMassagistas(massagemId: number, massagistaId?: number) {
    if (massagistaId !== undefined) {
      const massagista = await db.orm.public.Usuario.first({
        id: massagistaId,
      });
      if (!massagista?.perfis?.includes(Perfil.MASSAGISTA)) {
        throw new NotFoundException('Massagista não encontrada.');
      }
      const vinculo = await db.orm.public.MassagistaMassagem.where({
        usuarioId: massagistaId,
        massagemId,
      }).first();
      if (!vinculo) {
        throw new BadRequestException(
          'A massagista selecionada não realiza esse tipo de massagem.',
        );
      }
      return [{ id: massagista.id }];
    }

    const vinculos = await db.orm.public.MassagistaMassagem.where({
      massagemId,
    })
      .include('usuario')
      .all();
    return vinculos
      .filter((vinculo) => vinculo.usuario.perfis?.includes(Perfil.MASSAGISTA))
      .map((vinculo) => ({ id: vinculo.usuario.id }))
      .sort((a, b) => a.id - b.id);
  }

  private async buscarAgendamento(id: number) {
    const agendamento = await db.orm.public.Agendamento.first({ id });
    if (!agendamento) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    return agendamento;
  }

  private async aplicarReagendamento(
    autorId: number,
    agendamento: IntervaloAgendamento,
    dataHora: string,
    dataHoraFim: string,
    acao: string,
  ) {
    return this.comTratamentoSobreposicao(() =>
      db.transaction(async (tx) => {
        const atualizado = await this.atualizarAgendamentoSeStatus(
          tx,
          agendamento.id,
          agendamento.status,
          {
            dataHora,
            dataHoraFim,
            status: StatusAgendamento.REAGENDADO,
            lembrete24hEnviadoEm: null,
          },
        );
        await this.registrarHistorico(
          tx,
          autorId,
          agendamento.id,
          acao,
          this.snapshot(agendamento),
          {
            ...this.snapshot(agendamento),
            dataHora,
            dataHoraFim,
            status: StatusAgendamento.REAGENDADO,
          },
        );
        return atualizado;
      }),
    );
  }

  private async comTratamentoSobreposicao<T>(
    operacao: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operacao();
    } catch (error) {
      if (erroPostgres(error, '23P01', 'Agendamento_active_time_no_overlap')) {
        throw new ConflictException(
          'O horário acabou de ser reservado por outro agendamento. Escolha outro horário.',
        );
      }
      throw error;
    }
  }

  private async finalizar(
    usuario: UsuarioAgendamento,
    agendamentoId: number,
    status: StatusAgendamento.CONCLUIDO | StatusAgendamento.NAO_COMPARECEU,
    acao: string,
  ) {
    const agendamento = await this.buscarAgendamento(agendamentoId);
    this.exigirMassagistaOuGestorDoAgendamento(usuario, agendamento);
    this.exigirStatus(agendamento.status, STATUS_FINALIZAVEIS);
    const termino = agendamento.dataHoraFim
      ? new Date(agendamento.dataHoraFim).getTime()
      : new Date(agendamento.dataHora).getTime();
    if (status === StatusAgendamento.CONCLUIDO && termino > Date.now()) {
      throw new BadRequestException('O atendimento ainda não terminou.');
    }
    if (
      status === StatusAgendamento.NAO_COMPARECEU &&
      new Date(agendamento.dataHora).getTime() > Date.now()
    ) {
      throw new BadRequestException(
        'O horário do atendimento ainda não começou.',
      );
    }

    return db.transaction(async (tx) => {
      const atualizado = await this.atualizarAgendamentoSeStatus(
        tx,
        agendamentoId,
        agendamento.status,
        { status },
      );
      await this.registrarHistorico(
        tx,
        usuario.id,
        agendamentoId,
        acao,
        this.snapshot(agendamento),
        { ...this.snapshot(agendamento), status },
      );
      return atualizado;
    });
  }

  private async registrarHistorico(
    tx: ContextoTransacao,
    autorId: number,
    agendamentoId: number,
    acao: string,
    valoresAnteriores: DadosHistorico | null,
    valoresNovos: DadosHistorico | null,
  ) {
    const historico = await tx.orm.public.AgendamentoHistorico.create({
      autorId,
      agendamentoId,
      acao,
      valoresAnteriores,
      valoresNovos,
    });
    await this.registrarNotificacoesDaAcao(tx, agendamentoId, historico.id, acao);
  }

  private async registrarNotificacoesDaAcao(
    tx: ContextoTransacao,
    agendamentoId: number,
    historicoId: number,
    acao: string,
  ): Promise<void> {
    const evento = this.eventoNotificacao(acao);
    if (!evento) {
      return;
    }

    const agendamento = await tx.orm.public.Agendamento.first({
      id: agendamentoId,
    });
    if (!agendamento) {
      throw new InternalServerErrorException(
        'Não foi possível notificar sobre o agendamento.',
      );
    }
    const massagem = agendamento.massagemId
      ? await tx.orm.public.Massagem.first({ id: agendamento.massagemId })
      : null;
    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      timeZone: this.configuracao.fusoHorario,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(agendamento.dataHora));
    const nomeMassagem = massagem?.nome ?? 'atendimento';
    const mensagem = this.mensagemDaNotificacao(
      acao,
      nomeMassagem,
      dataFormatada,
    );
    const usuarioIds = [agendamento.usuarioId, agendamento.massagistaId]
      .filter((id): id is number => id !== null);

    if (acao === 'REAGENDAMENTO_SOLICITADO') {
      const usuarios = await tx.orm.public.Usuario.all();
      usuarioIds.push(
        ...usuarios
          .filter(
            (usuario) =>
              usuario.perfis?.includes(Perfil.ADMIN) ||
              usuario.perfis?.includes(Perfil.ADMINISTRATIVO),
          )
          .map((usuario) => usuario.id),
      );
    }

    await criarNotificacoes(tx, {
      agendamentoId,
      historicoId,
      chaveEvento: `historico:${historicoId}`,
      tipo: evento.tipo,
      titulo: evento.titulo,
      mensagem,
      usuarioIds,
    });
  }

  private eventoNotificacao(
    acao: string,
  ): { tipo: string; titulo: string } | null {
    switch (acao) {
      case 'CRIADO':
        return { tipo: 'NOVO_AGENDAMENTO', titulo: 'Novo agendamento' };
      case 'CONFIRMADO':
        return {
          tipo: 'AGENDAMENTO_CONFIRMADO',
          titulo: 'Agendamento confirmado',
        };
      case 'CANCELADO':
        return {
          tipo: 'AGENDAMENTO_CANCELADO',
          titulo: 'Agendamento cancelado',
        };
      case 'REAGENDADO_DIRETAMENTE':
      case 'SOLICITACAO_REAGENDAMENTO_APROVADA':
        return {
          tipo: 'AGENDAMENTO_REAGENDADO',
          titulo: 'Agendamento reagendado',
        };
      case 'REAGENDAMENTO_SOLICITADO':
        return {
          tipo: 'SOLICITACAO_REAGENDAMENTO',
          titulo: 'Solicitação de reagendamento',
        };
      case 'SOLICITACAO_REAGENDAMENTO_RECUSADA':
        return {
          tipo: 'RESPOSTA_REAGENDAMENTO',
          titulo: 'Resposta à solicitação de reagendamento',
        };
      default:
        return null;
    }
  }

  private mensagemDaNotificacao(
    acao: string,
    nomeMassagem: string,
    dataHora: string,
  ): string {
    switch (acao) {
      case 'CRIADO':
        return `Novo agendamento de ${nomeMassagem} para ${dataHora}; aguarda confirmação.`;
      case 'CONFIRMADO':
        return `O agendamento de ${nomeMassagem} para ${dataHora} foi confirmado.`;
      case 'CANCELADO':
        return `O agendamento de ${nomeMassagem} para ${dataHora} foi cancelado.`;
      case 'REAGENDADO_DIRETAMENTE':
      case 'SOLICITACAO_REAGENDAMENTO_APROVADA':
        return `O agendamento de ${nomeMassagem} foi reagendado para ${dataHora}.`;
      case 'REAGENDAMENTO_SOLICITADO':
        return `Foi solicitada alteração para um agendamento de ${nomeMassagem} marcado para ${dataHora}.`;
      case 'SOLICITACAO_REAGENDAMENTO_RECUSADA':
        return `A solicitação de reagendamento foi recusada. O atendimento permanece em ${dataHora}.`;
      default:
        return `Há uma atualização no agendamento de ${nomeMassagem} para ${dataHora}.`;
    }
  }

  private async atualizarAgendamentoSeStatus(
    tx: ContextoTransacao,
    agendamentoId: number,
    statusAtual: string,
    alteracoes: {
      status: string;
      dataHora?: string;
      dataHoraFim?: string;
      confirmadoPorId?: number;
      confirmadoEm?: string;
      lembrete24hEnviadoEm?: string | null;
    },
  ) {
    const atualizado = await tx.orm.public.Agendamento.where({
      id: agendamentoId,
      status: statusAtual,
    }).update(alteracoes);
    if (!atualizado) {
      throw new ConflictException(
        'O agendamento foi alterado por outra operação. Atualize os dados e tente novamente.',
      );
    }

    return atualizado;
  }

  private snapshot(agendamento: IntervaloAgendamento): DadosHistorico {
    return {
      status: agendamento.status,
      dataHora: agendamento.dataHora,
      dataHoraFim: agendamento.dataHoraFim,
      massagistaId: agendamento.massagistaId,
      massagemId: agendamento.massagemId,
      confirmadoPorId: agendamento.confirmadoPorId,
      confirmadoEm: agendamento.confirmadoEm,
      observacoes: agendamento.observacoes,
    };
  }

  private respeitaAntecedenciaCancelamento(dataHora: string): boolean {
    return (
      new Date(dataHora).getTime() - Date.now() >=
      this.configuracao.antecedenciaCancelamentoMinutos * 60_000
    );
  }

  private exigirStatus(status: string, permitidos: readonly string[]): void {
    if (!permitidos.includes(status)) {
      throw new ConflictException(
        `Transição inválida: o agendamento não pode sair do status ${status}.`,
      );
    }
  }

  private exigirPerfil(
    usuario: UsuarioAgendamento,
    permitidos: readonly Perfil[],
  ): void {
    if (!permitidos.some((perfil) => perfisDo(usuario).includes(perfil))) {
      throw new ForbiddenException(
        'Seu perfil não pode executar esta operação.',
      );
    }
  }

  private podeGerenciarTudo(usuario: UsuarioAgendamento): boolean {
    return (
      perfisDo(usuario).includes(Perfil.ADMIN) ||
      perfisDo(usuario).includes(Perfil.ADMINISTRATIVO)
    );
  }

  private exigirGestor(usuario: UsuarioAgendamento): void {
    if (!this.podeGerenciarTudo(usuario)) {
      throw new ForbiddenException(
        'Somente administradores e administrativos podem executar esta operação.',
      );
    }
  }

  private exigirMassagistaOuGestorDoAgendamento(
    usuario: UsuarioAgendamento,
    agendamento: IntervaloAgendamento,
  ): void {
    const eMassagistaDoAgendamento =
      perfisDo(usuario).includes(Perfil.MASSAGISTA) &&
      agendamento.massagistaId === usuario.id;
    if (!this.podeGerenciarTudo(usuario) && !eMassagistaDoAgendamento) {
      throw new ForbiddenException(
        'Somente a massagista responsável ou um administrador pode executar esta operação.',
      );
    }
  }

  private exigirAcessoLeitura(
    usuario: UsuarioAgendamento,
    agendamento: IntervaloAgendamento,
  ): void {
    const podeLer =
      this.podeGerenciarTudo(usuario) ||
      (perfisDo(usuario).includes(Perfil.CLIENTE) &&
        agendamento.usuarioId === usuario.id) ||
      (perfisDo(usuario).includes(Perfil.MASSAGISTA) &&
        agendamento.massagistaId === usuario.id);
    if (!podeLer) {
      throw new ForbiddenException(
        'Você não pode consultar este agendamento.',
      );
    }
  }

  private exigirDonoOuGestorOuMassagista(
    usuario: UsuarioAgendamento,
    agendamento: IntervaloAgendamento,
  ): void {
    const eDono =
      agendamento.usuarioId === usuario.id &&
      perfisDo(usuario).includes(Perfil.CLIENTE);
    const eMassagista =
      agendamento.massagistaId === usuario.id &&
      perfisDo(usuario).includes(Perfil.MASSAGISTA);
    if (!this.podeGerenciarTudo(usuario) && !eDono && !eMassagista) {
      throw new ForbiddenException('Você não pode cancelar este agendamento.');
    }
  }
}
