import {
    Body,
    Controller,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../usuarios/guards/admin.guard';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateAtivoDto } from './dto/update-ativo.dto';
import { MassagensService } from './massagens.service';

@ApiTags('Materiais')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('materiais')
export class MateriaisController {
    constructor(private readonly massagensService: MassagensService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar material (somente admin)' })
    criar(@Body() dto: CreateMaterialDto) {
        return this.massagensService.criarMaterial(dto);
    }

    @Patch(':id/ativo')
    @ApiOperation({ summary: 'Arquivar ou reativar material' })
    definirAtivo(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAtivoDto,
    ) {
        return this.massagensService.definirMaterialAtivo(id, dto.ativo);
    }
}