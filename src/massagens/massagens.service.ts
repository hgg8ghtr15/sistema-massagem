import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { db } from '../prisma/db';
import { Perfil } from '../usuarios/perfil.enum';
import { CreateMaterialDto } from './dto/create-material.dto';
import { CreateMassagemDto } from './dto/create-massagem.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { UpdateMassagemDto } from './dto/update-massagem.dto';
import { UpdateMateriaisMassagemDto } from './dto/update-materiais-massagem.dto';
import { normalizarYoutubeUrl } from './youtube-url';

@Injectable()
export class MassagensService {
    async criar(dto: CreateMassagemDto) {
        const nome = dto.nome.trim();
        const existente = await db.orm.public.Massagem.where({ nome }).first();

        if (existente) {
            throw new ConflictException('Já existe uma massagem com esse nome');
        }

        return db.orm.public.Massagem.create({
            nome,
            descricao: dto.descricao.trim(),
            duracaoMinutos: dto.duracaoMinutos,
            valorCentavos: dto.valorCentavos,
            youtubeUrl: normalizarYoutubeUrl(dto.youtubeUrl),
            ativo: true,
        });
    }

    async listarAtivas() {
        return db.orm.public.Massagem
            .where({ ativo: true })
            .include('materiais', (itens) => itens.include('material'))
            .include('massagistas', (vinculos) =>
                vinculos.include('usuario', (usuario) =>
                    usuario.select('id', 'nome', 'email', 'perfis'),
                ),
            )
            .all();
    }

    async buscarPorId(id: number) {
        const massagem = await db.orm.public.Massagem
            .where({ id })
            .include('materiais', (itens) => itens.include('material'))
            .include('massagistas', (vinculos) =>
                vinculos.include('usuario', (usuario) =>
                    usuario.select('id', 'nome', 'email', 'perfis'),
                ),
            )
            .first();

        if (!massagem) {
            throw new NotFoundException('Massagem não encontrada');
        }

        return massagem;
    }

    async atualizar(id: number, dto: UpdateMassagemDto) {
        const atual = await db.orm.public.Massagem.first({ id });

        if (!atual) {
            throw new NotFoundException('Massagem não encontrada');
        }

        if (Object.keys(dto).length === 0) {
            throw new BadRequestException('Informe ao menos um campo para atualizar');
        }

        const nome = dto.nome?.trim();
        if (nome && nome !== atual.nome) {
            const duplicada = await db.orm.public.Massagem.where({ nome }).first();
            if (duplicada) {
                throw new ConflictException('Já existe uma massagem com esse nome');
            }
        }

        return db.orm.public.Massagem.where({ id }).update({
            ...dto,
            ...(nome ? { nome } : {}),
            ...(dto.descricao ? { descricao: dto.descricao.trim() } : {}),
            ...(dto.youtubeUrl !== undefined
                ? { youtubeUrl: normalizarYoutubeUrl(dto.youtubeUrl) }
                : {}),
        });
    }

    async definirAtivo(id: number, ativo: boolean) {
        const atual = await db.orm.public.Massagem.first({ id });
        if (!atual) {
            throw new NotFoundException('Massagem não encontrada');
        }

        return db.orm.public.Massagem.where({ id }).update({ ativo });
    }

    async criarMaterial(dto: CreateMaterialDto) {
        const nome = dto.nome.trim();
        const existente = await db.orm.public.Material.where({ nome }).first();

        if (existente) {
            throw new ConflictException('Já existe um material com esse nome');
        }

        return db.orm.public.Material.create({
            nome,
            descricao: dto.descricao?.trim(),
            ativo: true,
        });
    }

    async listarMateriais() {
        return db.orm.public.Material.all();
    }

    async atualizarMaterial(id: number, dto: UpdateMaterialDto) {
        const material = await db.orm.public.Material.first({ id });
        if (!material) {
            throw new NotFoundException('Material não encontrado');
        }

        if (Object.keys(dto).length === 0) {
            throw new BadRequestException('Informe ao menos um campo para atualizar');
        }

        const nome = dto.nome?.trim();
        if (dto.nome !== undefined && (!nome || nome.length < 2)) {
            throw new BadRequestException('O nome do material deve ter pelo menos 2 caracteres');
        }
        if (nome && nome !== material.nome) {
            const existente = await db.orm.public.Material.where({ nome }).first();
            if (existente && existente.id !== id) {
                throw new ConflictException('Já existe um material com esse nome');
            }
        }

        return db.orm.public.Material.where({ id }).update({
            ...(nome ? { nome } : {}),
            ...(dto.descricao !== undefined
                ? { descricao: dto.descricao.trim() || null }
                : {}),
        });
    }

    async definirMaterialAtivo(id: number, ativo: boolean) {
        const material = await db.orm.public.Material.first({ id });
        if (!material) {
            throw new NotFoundException('Material não encontrado');
        }

        return db.orm.public.Material.where({ id }).update({ ativo });
    }

    async substituirMateriais(
        massagemId: number,
        dto: UpdateMateriaisMassagemDto,
    ) {
        const massagem = await db.orm.public.Massagem.first({ id: massagemId });
        if (!massagem) {
            throw new NotFoundException('Massagem não encontrada');
        }
        if (!massagem.ativo) {
            throw new BadRequestException('Não altere a ficha de uma massagem inativa');
        }

        const ids = dto.materiais.map((item) => item.materialId);
        const materiais = ids.length
            ? await db.orm.public.Material
                .where((material) => material.id.in(ids))
                .all()
            : [];

        if (materiais.length !== ids.length || materiais.some((item) => !item.ativo)) {
            throw new BadRequestException(
                'Todos os materiais precisam existir e estar ativos',
            );
        }

        await db.transaction(async (tx) => {
            await tx.orm.public.MassagemMaterial
                .where({ massagemId })
                .delete();

            for (const item of dto.materiais) {
                await tx.orm.public.MassagemMaterial.create({
                    massagemId,
                    materialId: item.materialId,
                    quantidade: item.quantidade,
                    unidade: item.unidade.trim(),
                });
            }
        });

        return this.buscarPorId(massagemId);
    }

    async vincularMassagista(massagemId: number, usuarioId: number) {
        const massagem = await db.orm.public.Massagem.first({ id: massagemId });
        if (!massagem || !massagem.ativo) {
            throw new NotFoundException('Massagem ativa não encontrada');
        }

        const usuario = await db.orm.public.Usuario.first({ id: usuarioId });
        if (!usuario) {
            throw new NotFoundException('Usuário não encontrado');
        }
        if (!usuario.perfis?.includes(Perfil.MASSAGISTA)) {
            throw new BadRequestException('O usuário informado não é massagista');
        }

        const vinculo = await db.orm.public.MassagistaMassagem
            .where({ usuarioId, massagemId })
            .first();
        if (vinculo) {
            throw new ConflictException('O massagista já está vinculado à massagem');
        }

        return db.orm.public.MassagistaMassagem.create({ usuarioId, massagemId });
    }

    async desvincularMassagista(massagemId: number, usuarioId: number) {
        const vinculo = await db.orm.public.MassagistaMassagem
            .where({ usuarioId, massagemId })
            .first();
        if (!vinculo) {
            throw new NotFoundException('Vínculo não encontrado');
        }

        await db.orm.public.MassagistaMassagem
            .where({ usuarioId, massagemId })
            .delete();

        return { message: 'Massagista desvinculado da massagem' };
    }
}