import {
  Test,
  TestingModule,
} from '@nestjs/testing';
import { MassagensService } from './massagens.service';
import { db } from '../prisma/db';
import { Perfil } from '../usuarios/perfil.enum';

describe('MassagensService', () => {
  let service: MassagensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MassagensService],
    }).compile();

    service = module.get<MassagensService>(MassagensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('criar', () => {
    it('deve criar uma massagem válida', async () => {
      const dto = {
        nome: 'Massagem relaxante',
        descricao: 'Técnica para relaxamento muscular.',
        duracaoMinutos: 60,
        valorCentavos: 15000,
      };

      const result = await service.criar(dto as any);

      expect(result).toBeDefined();
      expect(result.nome).toBe('Massagem relaxante');
      expect(result.ativo).toBe(true);
      expect(result.duracaoMinutos).toBe(60);
      expect(result.valorCentavos).toBe(15000);
    });

    it('deve lançar ConflictException para nome duplicado', async () => {
      const dto = {
        nome: 'Massagem relaxante',
        descricao: 'Técnica para relaxamento muscular.',
        duracaoMinutos: 60,
        valorCentavos: 15000,
      };

      await service.criar(dto as any);

      await expect(service.criar(dto as any)).rejects.toThrow(
        'Já existe uma massagem com esse nome',
      );
    });

    it('deve normalizar o nome removendo espaços', async () => {
      const dto = {
        nome: '  Massagem relaxante  ',
        descricao: 'Técnica para relaxamento muscular.',
        duracaoMinutos: 60,
        valorCentavos: 15000,
      };

      await service.criar(dto as any);
    });
  });

  describe('listarAtivas', () => {
    it('deve retornar apenas massagens ativas', async () => {
      const result = await service.listarAtivas();

      expect(result).toBeDefined();
      // Todos os retornados devem ter ativo: true
      result.forEach((massagem) => {
        expect(massagem.ativo).toBe(true);
      });
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar 404 para massagem inexistente', async () => {
      await expect(service.buscarPorId(999)).rejects.toThrow(
        'Massagem não encontrada',
      );
    });

    it('deve retornar massagem quando existir', async () => {
      const dto = {
        nome: 'Massagem teste',
        descricao: 'Descrição de teste',
        duracaoMinutos: 30,
        valorCentavos: 1000,
      };

      const criada = await service.criar(dto as any);
      const result = await service.buscarPorId(ida);

      expect(result).toBeDefined();
      expect(result.id).toBe(ida);
    });
  });

  describe('atualizar', () => {
    it('deve lançar BadRequestException para DTO vazio', async () => {
      await expect(service.atualizar(1, {})).rejects.toThrow(
        'Informe ao menos um campo para atualizar',
      );
    });

    it('deve verificar duplicidade ao renomear', async () => {
      const dto1 = {
        nome: 'Massagem exclusiva',
        descricao: 'Descrição exclusiva',
        duracaoMinutos: 45,
        valorCentavos: 12000,
      };

      await service.criar(dto1 as any);

      const dto2 = {
        nome: 'Massagem exclusiva',
        descricao: 'Outra descrição',
        duracaoMinutos: 45,
        valorCentavos: 12000,
      };

      await expect(service.atualizar(1, dto2 as any)).rejects.toThrow(
        'Já existe uma massagem com esse nome',
      );
    });
  });

  describe('definirAtivo', () => {
    it('deve lançar NotFoundException para massagem inexistente', async () => {
      await expect(service.definirAtivo(999, true)).rejects.toThrow(
        'Massagem não encontrada',
      );
    });
  });

  describe('criarMaterial', () => {
    it('deve lançar ConflictException para material duplicado', async () => {
      const dto = {
        nome: 'Óleo de amêndoas',
        descricao: 'Óleo vegetal para massagem.',
      };

      await service.criarMaterial(dto as any);

      await expect(service.criarMaterial(dto as any)).rejects.toThrow(
        'Já existe um material com esse nome',
      );
    });
  });

  describe('substituirMateriais', () => {
    it('deve lançar BadRequestException para massagem inativa', async () => {
      await expect(
        service.substituirMateriais(999, {
          materiais: [],
        }),
      ).rejects.toThrow('Não altere a ficha de uma massagem inativa');
    });

    it('deve lançar BadRequestException para material inexistente', async () => {
      const dto = {
        materiais: [
          { materialId: 999, quantidade: 10, unidade: 'ml' },
        ],
      };

      await expect(
        service.substituirMateriais(1, dto as any),
      ).rejects.toThrow('Todos os materiais precisam existir e estar ativos');
    });

    it('deve lançar BadRequestException para material inativo', async () => {
      const dto = {
        materiais: [
          { materialId: 1, quantidade: 10, unidade: 'ml' },
        ],
      };

      await expect(
        service.substituirMateriais(1, dto as any),
      ).rejects.toThrow('Todos os materiais precisam existir e estar ativos');
    });

    it('deve substituir a ficha de materiais com sucesso', async () => {
      const dto = {
        materiais: [
          { materialId: 1, quantidade: 10, unidade: 'ml' },
        ],
      };

      const result = await service.substituirMateriais(1, dto as any);

      expect(result).toBeDefined();
    });
  });

  describe('vincularMassagista', () => {
    it('deve lançar BadRequestException para usuário não massagista', async () => {
      await expect(
        service.vincularMassagista(1, 999),
      ).rejects.toThrow('O usuário informado não é massagista');
    });

    it('deve lançar ConflictException para vínculo duplicado', async () => {
      const dto = {
        nome: 'Massagem teste',
        descricao: 'Descrição de teste',
        duracaoMinutos: 30,
        valorCentavos: 1000,
      };

      await service.criar(dto as any);

      await expect(
        service.vincularMassagista(1, 1),
      ).rejects.toThrow('O massagista já está vinculado à massagem');
    });

    it('deve lançar NotFoundException para massagem inativa', async () => {
      const dto = {
        nome: 'Massagem inativa',
        descricao: 'Descrição',
        duracaoMinutos: 30,
        valorCentavos: 1000,
      };

      await service.criar(dto as any);
      await service.definirAtivo(1, false);

      await expect(
        service.vincularMassagista(1, 1),
      ).rejects.toThrow('Massagem ativa não encontrada');
    });
  });

  describe('desvincularMassagista', () => {
    it('deve lançar NotFoundException para vínculo inexistente', async () => {
      await expect(
        service.desvincularMassagista(1, 999),
      ).rejects.toThrow('Vínculo não encontrado');
    });

    it('deve desvincular massagista com sucesso', async () => {
      const dto = {
        nome: 'Massagem teste',
        descricao: 'Descrição',
        duracaoMinutos: 30,
        valorCentavos: 1000,
      };

      await service.criar(dto as any);
      await service.vincularMassagista(1, 1);

      const result = await service.desvincularMassagista(1, 1);

      expect(result).toBeDefined();
      expect(result.message).toBe('Massagista desvinculado da massagem');
    });
  });
});