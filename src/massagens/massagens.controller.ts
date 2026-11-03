import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../usuarios/guards/admin.guard';
import { CreateMassagemDto } from './dto/create-massagem.dto';
import { UpdateAtivoDto } from './dto/update-ativo.dto';
import { UpdateMassagemDto } from './dto/update-massagem.dto';
import { UpdateMateriaisMassagemDto } from './dto/update-materiais-massagem.dto';
import { MassagensService } from './massagens.service';

@ApiTags('Massagens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('massagens')
export class MassagensController {
    constructor(private readonly massagensService: MassagensService) { }

    @Post()
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Cadastrar massagem (somente admin)' })
    @ApiResponse({ status: 201, description: 'Massagem criada' })
    @ApiResponse({ status: 409, description: 'Nome já cadastrado' })
    criar(@Body() dto: CreateMassagemDto) {
        return this.massagensService.criar(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar massagens ativas' })
    listar() {
        return this.massagensService.listarAtivas();
    }

    @Get(':id')
    buscar(@Param('id', ParseIntPipe) id: number) {
        return this.massagensService.buscarPorId(id);
    }

    @Patch(':id')
    @UseGuards(AdminGuard)
    atualizar(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateMassagemDto,
    ) {
        return this.massagensService.atualizar(id, dto);
    }

    @Patch(':id/ativo')
    @UseGuards(AdminGuard)
    definirAtivo(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAtivoDto,
    ) {
        return this.massagensService.definirAtivo(id, dto.ativo);
    }

    @Put(':id/materiais')
    @UseGuards(AdminGuard)
    substituirMateriais(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateMateriaisMassagemDto,
    ) {
        return this.massagensService.substituirMateriais(id, dto);
    }

    @Put(':id/massagistas/:usuarioId')
    @UseGuards(AdminGuard)
    vincularMassagista(
        @Param('id', ParseIntPipe) id: number,
        @Param('usuarioId', ParseIntPipe) usuarioId: number,
    ) {
        return this.massagensService.vincularMassagista(id, usuarioId);
    }

    @Delete(':id/massagistas/:usuarioId')
    @UseGuards(AdminGuard)
    desvincularMassagista(
        @Param('id', ParseIntPipe) id: number,
        @Param('usuarioId', ParseIntPipe) usuarioId: number,
    ) {
        return this.massagensService.desvincularMassagista(id, usuarioId);
    }
}