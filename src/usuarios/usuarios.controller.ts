import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { RegisterDto } from './dto/register.dto';
import { UpdatePerfilDto, UpdatePerfisDto } from './dto/update-perfil.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('Usuários')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastrar um cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com perfil CLIENTE' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  register(@Body() dto: RegisterDto) {
    return this.usuariosService.register(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuários (somente admin)' })
  listar() {
    return this.usuariosService.listar();
  }

  @Patch(':id/perfil')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atribuir um perfil a um usuário (somente admin)' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Autenticação necessária' })
  @ApiResponse({ status: 403, description: 'Somente administradores podem alterar perfis' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 400, description: 'Perfil ou identificador inválido' })
  updatePerfil(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePerfilDto,
  ) {
    return this.usuariosService.updatePerfil(id, dto.perfil);
  }

  @Patch(':id/perfis')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Substituir perfis de um usuário (somente admin)' })
  @ApiResponse({ status: 200, description: 'Perfis atualizados com sucesso' })
  @ApiResponse({ status: 400, description: 'Lista de perfis inválida' })
  @ApiResponse({ status: 401, description: 'Autenticação necessária' })
  @ApiResponse({ status: 403, description: 'Somente administradores podem alterar perfis' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  updatePerfis(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePerfisDto,
  ) {
    return this.usuariosService.updatePerfis(id, dto.perfis);
  }
}
