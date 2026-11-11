import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GestorAgendamentoGuard } from './guards/gestor-agendamento.guard';
import type { UsuarioAgendamento } from './agendamentos.service';
import { AgendamentosService } from './agendamentos.service';
import { CancelarAgendamentoDto } from './dto/cancelar-agendamento.dto';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';
import { HorariosLivresDto } from './dto/horarios-livres.dto';
import { ListarAgendamentosDto } from './dto/listar-agendamentos.dto';
import { ListarSolicitacoesDto } from './dto/listar-solicitacoes.dto';
import { ReagendarAgendamentoDto } from './dto/reagendar-agendamento.dto';
import { ResponderReagendamentoDto } from './dto/responder-reagendamento.dto';
import { SolicitarReagendamentoDto } from './dto/solicitar-reagendamento.dto';

interface AgendamentoRequest extends Request {
  user: UsuarioAgendamento;
}

@ApiTags('Agendamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentosService: AgendamentosService) {}

  @Get('horarios-livres')
  @ApiOperation({ summary: 'Consultar horários livres para uma massagem e data' })
  @ApiQuery({ name: 'massagemId', type: Number, required: true })
  @ApiQuery({ name: 'data', type: String, required: true, example: '2027-03-10' })
  @ApiQuery({ name: 'massagistaId', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Horários válidos e massagistas disponíveis' })
  consultarHorariosLivres(@Query() dto: HorariosLivresDto) {
    return this.agendamentosService.horariosLivres(dto);
  }

  @Get('opcoes-filtro')
  @UseGuards(GestorAgendamentoGuard)
  @ApiOperation({ summary: 'Listar nomes de clientes e massagistas para filtros de gestão' })
  @ApiResponse({ status: 200, description: 'Opções mínimas de filtro sem e-mails' })
  opcoesFiltro(@Req() request: AgendamentoRequest) {
    return this.agendamentosService.opcoesFiltro(request.user);
  }

  @Get('solicitacoes-reagendamento')
  @ApiOperation({ summary: 'Listar solicitações de reagendamento acessíveis ao usuário' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDENTE', 'APROVADA', 'RECUSADA', 'CANCELADA'] })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Solicitações paginadas' })
  listarSolicitacoes(
    @Req() request: AgendamentoRequest,
    @Query() filtros: ListarSolicitacoesDto,
  ) {
    return this.agendamentosService.listarSolicitacoes(
      request.user,
      filtros,
    );
  }

  @Post('solicitacoes-reagendamento/:id/responder')
  @UseGuards(GestorAgendamentoGuard)
  @ApiOperation({ summary: 'Aprovar ou recusar uma solicitação de reagendamento' })
  @ApiResponse({ status: 200, description: 'Solicitação respondida' })
  responderSolicitacao(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderReagendamentoDto,
  ) {
    return this.agendamentosService.responderSolicitacaoReagendamento(
      request.user,
      id,
      dto.aprovar,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar agendamentos com filtros e paginação' })
  @ApiQuery({ name: 'data', type: String, required: false, example: '2027-03-10' })
  @ApiQuery({ name: 'massagistaId', type: Number, required: false })
  @ApiQuery({ name: 'clienteId', type: Number, required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDENTE', 'CONFIRMADO', 'REAGENDAMENTO_SOLICITADO', 'REAGENDADO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU'] })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Agendamentos paginados' })
  listar(
    @Req() request: AgendamentoRequest,
    @Query() filtros: ListarAgendamentosDto,
  ) {
    return this.agendamentosService.listar(request.user, filtros);
  }

  @Post()
  @ApiOperation({ summary: 'Criar agendamento pendente' })
  @ApiResponse({ status: 201, description: 'Agendamento criado; o término é calculado no servidor' })
  @ApiResponse({ status: 400, description: 'Horário inválido ou indisponível' })
  criar(
    @Req() request: AgendamentoRequest,
    @Body() dto: CriarAgendamentoDto,
  ) {
    return this.agendamentosService.criar(request.user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar agendamento, solicitações e histórico' })
  @ApiResponse({ status: 200, description: 'Detalhes do agendamento' })
  @ApiResponse({ status: 403, description: 'Sem acesso ao agendamento' })
  detalhar(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.agendamentosService.detalhar(request.user, id);
  }

  @Post(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar agendamento como massagista responsável ou gestor' })
  @ApiResponse({ status: 200, description: 'Agendamento confirmado' })
  confirmar(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.agendamentosService.confirmar(request.user, id);
  }

  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar agendamento' })
  @ApiResponse({ status: 200, description: 'Agendamento cancelado' })
  cancelar(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: CancelarAgendamentoDto,
  ) {
    return this.agendamentosService.cancelar(request.user, id, dto?.motivo);
  }

  @Post(':id/reagendar')
  @UseGuards(GestorAgendamentoGuard)
  @ApiOperation({ summary: 'Reagendar diretamente como administrador ou administrativo' })
  @ApiResponse({ status: 200, description: 'Agendamento reagendado' })
  reagendar(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReagendarAgendamentoDto,
  ) {
    return this.agendamentosService.reagendarDiretamente(
      request.user,
      id,
      dto.dataHora,
    );
  }

  @Post(':id/solicitacoes-reagendamento')
  @ApiOperation({ summary: 'Solicitar reagendamento como cliente' })
  @ApiResponse({ status: 201, description: 'Solicitação criada' })
  solicitarReagendamento(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SolicitarReagendamentoDto,
  ) {
    return this.agendamentosService.solicitarReagendamento(
      request.user,
      id,
      dto.dataHoraSugerida,
      dto.motivo,
    );
  }

  @Post(':id/concluir')
  @ApiOperation({ summary: 'Marcar atendimento como concluído' })
  concluir(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.agendamentosService.concluir(request.user, id);
  }

  @Post(':id/nao-compareceu')
  @ApiOperation({ summary: 'Marcar cliente como não compareceu' })
  marcarNaoCompareceu(
    @Req() request: AgendamentoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.agendamentosService.marcarNaoCompareceu(request.user, id);
  }
}
