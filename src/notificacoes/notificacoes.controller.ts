import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import type { UsuarioAgendamento } from '../agendamentos/agendamentos.service';
import { ListarNotificacoesDto } from './dto/listar-notificacoes.dto';
import { NotificacoesService } from './notificacoes.service';

interface NotificacaoRequest extends Request {
  user: UsuarioAgendamento;
}

@ApiTags('Notificações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário autenticado' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Notificações paginadas' })
  listar(
    @Req() request: NotificacaoRequest,
    @Query() filtros: ListarNotificacoesDto,
  ) {
    return this.notificacoesService.listar(
      request.user.id,
      filtros.page,
      filtros.limit,
    );
  }

  @Patch(':id/lida')
  @ApiOperation({ summary: 'Marcar uma notificação própria como lida' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  marcarComoLida(
    @Req() request: NotificacaoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificacoesService.marcarComoLida(request.user.id, id);
  }
}
