import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  describe('substituirHorariosTrabalho', () => {
    it('rejeita intervalos em que o início não antecede o fim', async () => {
      await expect(
        service.substituirHorariosTrabalho(1, [
          { diaSemana: 1, inicio: '12:00', fim: '09:00' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita intervalos sobrepostos no mesmo dia', async () => {
      await expect(
        service.substituirHorariosTrabalho(1, [
          { diaSemana: 1, inicio: '09:00', fim: '12:00' },
          { diaSemana: 1, inicio: '11:30', fim: '13:00' },
        ]),
      ).rejects.toThrow(
        'Os intervalos de trabalho da massagista não podem se sobrepor na segunda-feira (09:00–12:00 e 11:30–13:00).',
      );
    });

  });
});
