import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { db } from '../src/prisma/db';
import { AppModule } from '../src/app.module';
import { EmailDeliveryService } from '../src/notificacoes/email-delivery.service';
import { NotificacoesWorker } from '../src/notificacoes/notificacoes.worker';
import { Perfil } from '../src/usuarios/perfil.enum';

function dataFuturaIso(dias: number, horaUtc = 16): string {
  const data = new Date(Date.now() + dias * 24 * 60 * 60_000);
  data.setUTCHours(horaUtc, 0, 0, 0);
  return data.toISOString();
}

function dataLocal(iso: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const valores = Object.fromEntries(
    partes.map(({ type, value }) => [type, value]),
  );
  return `${valores.year}-${valores.month}-${valores.day}`;
}

describe('Agendamentos API (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let clienteId: number;
  let outroClienteId: number;
  let massagistaId: number;
  let adminId: number;
  let administrativoId: number;
  let massagemId: number;
  let tokenCliente: string;
  let tokenOutroCliente: string;
  let tokenMassagista: string;
  let tokenAdmin: string;
  let tokenAdministrativo: string;
  let agendamentoClienteId: number;
  let agendamentoOutroClienteId: number;
  let agendamentoCriadoId: number;
  let solicitacaoId: number;
  let agendamentoLembreteId: number;
  const sufixo = `${Date.now()}-${randomUUID()}`;
  const dataHoraCliente = dataFuturaIso(10, 16);
  const dataHoraOutroCliente = dataFuturaIso(10, 18);

  const criarUsuario = async (nome: string, perfil: Perfil) =>
    db.orm.public.Usuario.create({
      email: `${nome.toLowerCase()}-${sufixo}@example.invalid`,
      nome,
      senha: 'senha-de-teste',
      perfis: [perfil],
    });

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function limparFixturesDeExecucoesAnteriores() {
    const massagens = (await db.orm.public.Massagem.all()).filter((massagem) =>
      massagem.nome.startsWith('Massagem e2e '),
    );
    for (const massagem of massagens) {
      const sufixoAnterior = massagem.nome.slice('Massagem e2e '.length);
      const massagista = await db.orm.public.Usuario.first({
        email: `massagista-${sufixoAnterior}@example.invalid`,
      });
      const agendamentos = await db.orm.public.Agendamento.where({
        massagemId: massagem.id,
      }).all();
      for (const agendamento of agendamentos) {
        await db.orm.public.Agendamento.where({ id: agendamento.id }).delete();
      }

      const vinculos = await db.orm.public.MassagistaMassagem.where({
        massagemId: massagem.id,
      }).all();
      for (const vinculo of vinculos) {
        await db.orm.public.MassagistaMassagem.where({
          usuarioId: vinculo.usuarioId,
          massagemId: massagem.id,
        }).delete();
      }
      if (massagista) {
        const horarios = await db.orm.public.HorarioTrabalho.where({
          usuarioId: massagista.id,
        }).all();
        for (const horario of horarios) {
          await db.orm.public.HorarioTrabalho.where({
            id: horario.id,
          }).delete();
        }
      }

      await db.orm.public.Massagem.where({ id: massagem.id }).delete();
      for (const nome of ['cliente', 'outro', 'massagista', 'admin']) {
        const usuario = await db.orm.public.Usuario.first({
          email: `${nome}-${sufixoAnterior}@example.invalid`,
        });
        if (usuario) {
          await db.orm.public.Usuario.where({ id: usuario.id }).delete();
        }
      }
    }
  }

  beforeAll(async () => {
    await limparFixturesDeExecucoesAnteriores();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = app.get(JwtService);

    const cliente = await criarUsuario(`Cliente-${sufixo}`, Perfil.CLIENTE);
    const outroCliente = await criarUsuario(
      `Outro-${sufixo}`,
      Perfil.CLIENTE,
    );
    const massagista = await criarUsuario(
      `Massagista-${sufixo}`,
      Perfil.MASSAGISTA,
    );
    const admin = await criarUsuario(`Admin-${sufixo}`, Perfil.ADMIN);
    const administrativo = await criarUsuario(
      `Administrativo-${sufixo}`,
      Perfil.ADMINISTRATIVO,
    );
    clienteId = cliente.id;
    outroClienteId = outroCliente.id;
    massagistaId = massagista.id;
    adminId = admin.id;
    administrativoId = administrativo.id;

    const criarToken = (usuario: { id: number; email: string }) =>
      jwt.sign({
        sub: usuario.id,
        email: usuario.email,
        jti: randomUUID(),
      });
    tokenCliente = criarToken(cliente);
    tokenOutroCliente = criarToken(outroCliente);
    tokenMassagista = criarToken(massagista);
    tokenAdmin = criarToken(admin);
    tokenAdministrativo = criarToken(administrativo);

    const massagem = await db.orm.public.Massagem.create({
      nome: `Massagem e2e ${sufixo}`,
      descricao: 'Massagem criada pelos testes de API.',
      duracaoMinutos: 60,
      valorCentavos: 10000,
      ativo: true,
    });
    massagemId = massagem.id;
    await db.orm.public.MassagistaMassagem.create({
      usuarioId: massagistaId,
      massagemId,
    });
    for (let diaSemana = 0; diaSemana <= 6; diaSemana += 1) {
      await db.orm.public.HorarioTrabalho.create({
        usuarioId: massagistaId,
        diaSemana,
        inicio: '00:00',
        fim: '23:59',
      });
    }

    const dataHoraFimCliente = new Date(
      new Date(dataHoraCliente).getTime() + 60 * 60_000,
    ).toISOString();
    const dataHoraFimOutroCliente = new Date(
      new Date(dataHoraOutroCliente).getTime() + 60 * 60_000,
    ).toISOString();
    const agendamentoCliente = await db.orm.public.Agendamento.create({
      usuarioId: clienteId,
      massagemId,
      massagistaId,
      dataHora: dataHoraCliente,
      dataHoraFim: dataHoraFimCliente,
      status: 'PENDENTE',
    });
    const agendamentoOutroCliente = await db.orm.public.Agendamento.create({
      usuarioId: outroClienteId,
      massagemId,
      massagistaId,
      dataHora: dataHoraOutroCliente,
      dataHoraFim: dataHoraFimOutroCliente,
      status: 'PENDENTE',
    });
    agendamentoClienteId = agendamentoCliente.id;
    agendamentoOutroClienteId = agendamentoOutroCliente.id;
  });

  afterAll(async () => {
    if (massagistaId) {
      const agendamentos = await db.orm.public.Agendamento.where({
        massagistaId,
      }).all();
      for (const agendamento of agendamentos) {
        await db.orm.public.Agendamento.where({ id: agendamento.id }).delete();
      }
      await db.orm.public.HorarioTrabalho.where({
        usuarioId: massagistaId,
      }).delete();
      await db.orm.public.MassagistaMassagem.where({
        usuarioId: massagistaId,
        massagemId,
      }).delete();
    }
    if (massagemId) {
      await db.orm.public.Massagem.where({ id: massagemId }).delete();
    }
    for (const id of [
      clienteId,
      outroClienteId,
      massagistaId,
      adminId,
      administrativoId,
    ]) {
      if (id) {
        await db.orm.public.Usuario.where({ id }).delete();
      }
    }
    await app.close();
  });

  it('limita listagem ao próprio cliente e permite à massagista consultar sua agenda', async () => {
    const clienteResponse = await request(app.getHttpServer())
      .get('/api/agendamentos')
      .query({ data: dataLocal(dataHoraCliente), page: 1, limit: 10 })
      .set(bearer(tokenCliente))
      .expect(200);
    expect(clienteResponse.body.data.map((item: { usuarioId: number }) => item.usuarioId))
      .toEqual([clienteId]);

    const massagistaResponse = await request(app.getHttpServer())
      .get('/api/agendamentos')
      .query({ massagistaId, page: 1, limit: 1 })
      .set(bearer(tokenMassagista))
      .expect(200);
    expect(massagistaResponse.body.data).toHaveLength(1);
    expect(massagistaResponse.body.pagination.hasMore).toBe(true);

    const adminResponse = await request(app.getHttpServer())
      .get('/api/agendamentos')
      .query({ clienteId: outroClienteId })
      .set(bearer(tokenAdmin))
      .expect(200);
    expect(adminResponse.body.data.map((item: { usuarioId: number }) => item.usuarioId))
      .toEqual([outroClienteId]);
  });

  it('fornece opções mínimas de filtros a gestores e nega acesso a clientes', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/agendamentos/opcoes-filtro')
      .set(bearer(tokenAdministrativo))
      .expect(200);
    const cliente = resposta.body.clientes.find(
      (item: { id: number }) => item.id === clienteId,
    );
    const massagista = resposta.body.massagistas.find(
      (item: { id: number }) => item.id === massagistaId,
    );

    expect(cliente).toEqual({ id: clienteId, nome: expect.any(String) });
    expect(massagista).toEqual({ id: massagistaId, nome: expect.any(String) });

    await request(app.getHttpServer())
      .get('/api/agendamentos/opcoes-filtro')
      .set(bearer(tokenCliente))
      .expect(403);
  });

  it('restringe detalhes ao cliente dono ou à massagista responsável', async () => {
    await request(app.getHttpServer())
      .get(`/api/agendamentos/${agendamentoClienteId}`)
      .set(bearer(tokenCliente))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/agendamentos/${agendamentoOutroClienteId}`)
      .set(bearer(tokenCliente))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/agendamentos/${agendamentoClienteId}`)
      .set(bearer(tokenOutroCliente))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/agendamentos/${agendamentoClienteId}`)
      .set(bearer(tokenMassagista))
      .expect(200);
  });

  it('rejeita ações sem permissão e confirma pela massagista responsável', async () => {
    await request(app.getHttpServer())
      .post(`/api/agendamentos/${agendamentoClienteId}/confirmar`)
      .set(bearer(tokenCliente))
      .expect(403);

    const resposta = await request(app.getHttpServer())
      .post(`/api/agendamentos/${agendamentoClienteId}/confirmar`)
      .set(bearer(tokenMassagista))
      .expect(201);
    expect(resposta.body.status).toBe('CONFIRMADO');
    expect(resposta.body.confirmadoPorId).toBe(massagistaId);
  });

  it('valida as entradas e cria agendamento com horário de término calculado', async () => {
    await request(app.getHttpServer())
      .post('/api/agendamentos')
      .set(bearer(tokenCliente))
      .send({
        dataHora: '2040-03-10T10:00:00',
        massagemId,
        massagistaId,
      })
      .expect(400);

    const dataHora = dataFuturaIso(12, 20);
    const resposta = await request(app.getHttpServer())
      .post('/api/agendamentos')
      .set(bearer(tokenCliente))
      .send({ dataHora, massagemId, massagistaId })
      .expect(201);
    agendamentoCriadoId = resposta.body.id;
    expect(resposta.body.status).toBe('PENDENTE');
    expect(
      new Date(resposta.body.dataHoraFim).getTime() -
        new Date(resposta.body.dataHora).getTime(),
    ).toBe(60 * 60_000);
  });

  it('permite que um perfil administrativo crie agendamento para um cliente', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/agendamentos')
      .set(bearer(tokenAdministrativo))
      .send({
        dataHora: dataFuturaIso(12, 22),
        massagemId,
        massagistaId,
        clienteId,
      })
      .expect(201);
    expect(resposta.body.usuarioId).toBe(clienteId);
  });

  it('retorna horários livres para a data e massagem solicitadas', async () => {
    const data = dataLocal(dataFuturaIso(14, 16));
    const resposta = await request(app.getHttpServer())
      .get('/api/agendamentos/horarios-livres')
      .query({ data, massagemId, massagistaId })
      .set(bearer(tokenCliente))
      .expect(200);

    expect(resposta.body.data).toBe(data);
    expect(resposta.body.horarios.length).toBeGreaterThan(0);
    expect(resposta.body.horarios[0].massagistaIds).toContain(massagistaId);
  });

  it('permite ao cliente solicitar reagendamento e ao gestor responder', async () => {
    const dataHoraSugerida = dataFuturaIso(20, 16);
    const solicitacao = await request(app.getHttpServer())
      .post(`/api/agendamentos/${agendamentoClienteId}/solicitacoes-reagendamento`)
      .set(bearer(tokenCliente))
      .send({ dataHoraSugerida, motivo: 'Compromisso pessoal' })
      .expect(201);
    solicitacaoId = solicitacao.body.id;
    expect(solicitacao.body.status).toBe('PENDENTE');

    await request(app.getHttpServer())
      .post(`/api/agendamentos/solicitacoes-reagendamento/${solicitacaoId}/responder`)
      .set(bearer(tokenOutroCliente))
      .send({ aprovar: true })
      .expect(403);

    const listaCliente = await request(app.getHttpServer())
      .get('/api/agendamentos/solicitacoes-reagendamento')
      .query({ status: 'PENDENTE' })
      .set(bearer(tokenCliente))
      .expect(200);
    expect(listaCliente.body.data.map((item: { id: number }) => item.id))
      .toContain(solicitacaoId);

    const notificacoesAdmin = await request(app.getHttpServer())
      .get('/api/notificacoes')
      .set(bearer(tokenAdmin))
      .expect(200);
    expect(
      notificacoesAdmin.body.data.some(
        (item: { agendamentoId: number; tipo: string }) =>
          item.agendamentoId === agendamentoClienteId &&
          item.tipo === 'SOLICITACAO_REAGENDAMENTO',
      ),
    ).toBe(true);

    const resposta = await request(app.getHttpServer())
      .post(`/api/agendamentos/solicitacoes-reagendamento/${solicitacaoId}/responder`)
      .set(bearer(tokenAdministrativo))
      .send({ aprovar: true })
      .expect(201);
    expect(resposta.body.status).toBe('REAGENDADO');
  });

  it('permite reagendamento direto somente a gestores e cancelamento pelo cliente', async () => {
    await request(app.getHttpServer())
      .post(`/api/agendamentos/${agendamentoOutroClienteId}/reagendar`)
      .set(bearer(tokenOutroCliente))
      .send({ dataHora: dataFuturaIso(25, 18) })
      .expect(403);

    const reagendado = await request(app.getHttpServer())
      .post(`/api/agendamentos/${agendamentoOutroClienteId}/reagendar`)
      .set(bearer(tokenAdmin))
      .send({ dataHora: dataFuturaIso(25, 18) })
      .expect(201);
    expect(reagendado.body.status).toBe('REAGENDADO');

    const cancelado = await request(app.getHttpServer())
      .post(`/api/agendamentos/${agendamentoCriadoId}/cancelar`)
      .set(bearer(tokenCliente))
      .send({ motivo: 'Mudança de planos' })
      .expect(201);
    expect(cancelado.body.status).toBe('CANCELADO');
  });

  it('lista apenas as notificações próprias e marca uma como lida', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/notificacoes')
      .set(bearer(tokenCliente))
      .expect(200);
    const nova = resposta.body.data.find(
      (item: { agendamentoId: number; tipo: string }) =>
        item.agendamentoId === agendamentoCriadoId &&
        item.tipo === 'NOVO_AGENDAMENTO',
    );
    expect(nova).toBeDefined();

    const marcada = await request(app.getHttpServer())
      .patch(`/api/notificacoes/${nova.id}/lida`)
      .set(bearer(tokenCliente))
      .expect(200);
    expect(marcada.body.lidaEm).toBeTruthy();

    const notificacaoDaMassagista =
      await db.orm.public.Notificacao.where({
        usuarioId: massagistaId,
        agendamentoId: agendamentoCriadoId,
        tipo: 'NOVO_AGENDAMENTO',
      }).first();
    if (!notificacaoDaMassagista) {
      throw new Error('A notificação da massagista não foi criada.');
    }
    await request(app.getHttpServer())
      .patch(`/api/notificacoes/${notificacaoDaMassagista.id}/lida`)
      .set(bearer(tokenCliente))
      .expect(404);
  });

  it('envia e-mails da fila e cria um único lembrete 24 horas antes', async () => {
    const email = app.get(EmailDeliveryService);
    const configurado = jest
      .spyOn(email, 'configurado', 'get')
      .mockReturnValue(true);
    const envio = jest.spyOn(email, 'enviar').mockResolvedValue();
    try {
      await app.get(NotificacoesWorker).enviarEmailsPendentes();
      const notificacaoEmail = await db.orm.public.Notificacao.where({
        usuarioId: clienteId,
        agendamentoId: agendamentoCriadoId,
        tipo: 'NOVO_AGENDAMENTO',
      }).first();
      expect(notificacaoEmail?.emailStatus).toBe('ENVIADA');
      const cliente = await db.orm.public.Usuario.first({ id: clienteId });
      expect(envio).toHaveBeenCalledWith(
        cliente?.email,
        cliente?.nome,
        expect.any(String),
        expect.any(String),
      );

      const dataHora = new Date(Date.now() + 23 * 60 * 60_000).toISOString();
      const agendamento = await db.orm.public.Agendamento.create({
        usuarioId: clienteId,
        massagemId,
        massagistaId,
        dataHora,
        dataHoraFim: new Date(
          new Date(dataHora).getTime() + 60 * 60_000,
        ).toISOString(),
        status: 'CONFIRMADO',
      });
      agendamentoLembreteId = agendamento.id;

      const worker = app.get(NotificacoesWorker);
      await worker.enviarLembretes24h();
      await worker.enviarLembretes24h();
      const lembretes = await db.orm.public.Notificacao.where({
        agendamentoId: agendamentoLembreteId,
        tipo: 'LEMBRETE_24H',
      }).all();
      expect(lembretes).toHaveLength(2);
      const destinatarios = lembretes.map((item) => item.usuarioId);
      expect(destinatarios.sort((a, b) => a - b)).toEqual(
        [clienteId, massagistaId].sort((a, b) => a - b),
      );
    } finally {
      envio.mockRestore();
      configurado.mockRestore();
    }
  });

  it('aplica limites de paginação e exige autenticação', async () => {
    await request(app.getHttpServer())
      .get('/api/agendamentos')
      .query({ limit: 101 })
      .set(bearer(tokenCliente))
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/agendamentos')
      .expect(401);
  });
});
