import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { db } from '../prisma/db';
import { Perfil } from './perfil.enum';
import { RegisterDto } from './dto/register.dto';
import { HorarioTrabalhoDto } from './dto/substituir-horarios-trabalho.dto';

const diasDaSemana = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

function minutosDoRelogio(horario: string): number {
  const [hora, minuto] = horario.split(':').map(Number);
  return hora * 60 + minuto;
}

@Injectable()
export class UsuariosService {
  constructor(private readonly authService: AuthService) {}

  async register(dto: RegisterDto) {
    const existingUser = await db.orm.public.Usuario.where({
      email: dto.email,
    }).first();

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.senha, 10);
    const user = await db.orm.public.Usuario.create({
      email: dto.email,
      nome: dto.nome,
      senha: hashedPassword,
      perfis: [Perfil.CLIENTE],
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        perfil: user.perfis?.[0] ?? Perfil.CLIENTE,
        perfis: user.perfis ?? [Perfil.CLIENTE],
        createdAt: user.createdAt,
      },
      token: this.authService.createAccessToken(user.id, user.email),
    };
  }

  async listar() {
    const users = await db.orm.public.Usuario
      .select('id', 'email', 'nome', 'perfis', 'createdAt')
      .all();

    return users.map((user) => {
      const perfis = user.perfis ?? [Perfil.CLIENTE];
      return { ...user, perfil: perfis[0], perfis };
    });
  }

  async listarMassagistas() {
    const usuarios = await db.orm.public.Usuario
      .select('id', 'nome', 'perfis')
      .all();

    return usuarios
      .filter((usuario) => usuario.perfis?.includes(Perfil.MASSAGISTA))
      .map(({ id, nome }) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async horariosTrabalho(usuarioId: number) {
    const usuario = await db.orm.public.Usuario.first({ id: usuarioId });
    if (!usuario?.perfis?.includes(Perfil.MASSAGISTA)) {
      throw new NotFoundException('Massagista não encontrada');
    }

    const horarios = await db.orm.public.HorarioTrabalho
      .where({ usuarioId })
      .all();

    return horarios.sort(
      (a, b) =>
        a.diaSemana - b.diaSemana ||
        a.inicio.localeCompare(b.inicio),
    );
  }

  async substituirHorariosTrabalho(
    usuarioId: number,
    horarios: HorarioTrabalhoDto[],
  ) {
    const horariosOrdenados = [...horarios].sort(
      (a, b) =>
        a.diaSemana - b.diaSemana ||
        a.inicio.localeCompare(b.inicio),
    );

    for (let indice = 0; indice < horariosOrdenados.length; indice += 1) {
      const atual = horariosOrdenados[indice];
      if (minutosDoRelogio(atual.inicio) >= minutosDoRelogio(atual.fim)) {
        throw new BadRequestException(
          'O horário de início deve ser anterior ao horário de fim.',
        );
      }

      const anterior = horariosOrdenados[indice - 1];
      if (
        anterior?.diaSemana === atual.diaSemana &&
        minutosDoRelogio(atual.inicio) < minutosDoRelogio(anterior.fim)
      ) {
        throw new BadRequestException(
          `Os intervalos de trabalho da massagista não podem se sobrepor na ${diasDaSemana[atual.diaSemana]} (${anterior.inicio}–${anterior.fim} e ${atual.inicio}–${atual.fim}).`,
        );
      }
    }

    const usuario = await db.orm.public.Usuario.first({ id: usuarioId });
    if (!usuario?.perfis?.includes(Perfil.MASSAGISTA)) {
      throw new NotFoundException('Massagista não encontrada');
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.HorarioTrabalho.where({ usuarioId }).delete();
      for (const horario of horariosOrdenados) {
        await tx.orm.public.HorarioTrabalho.create({
          usuarioId,
          diaSemana: horario.diaSemana,
          inicio: horario.inicio,
          fim: horario.fim,
        });
      }
    });

    return this.horariosTrabalho(usuarioId);
  }

  async updatePerfil(id: number, perfil: Perfil) {
    const currentUser = await db.orm.public.Usuario.first({ id });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const currentPerfis = (currentUser.perfis ?? [])
      .filter((item): item is Perfil =>
        Object.values(Perfil).some((validPerfil) => validPerfil === item),
      );
    return this.updatePerfis(id, [...new Set([...currentPerfis, perfil])]);
  }

  async updatePerfis(id: number, perfis: Perfil[]) {
    const currentUser = await db.orm.public.Usuario.first({ id });
    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updatedPerfis = [...new Set(perfis)];
    const user = await db.transaction(async (tx) => {
      const updatedUser = await tx.orm.public.Usuario.where({ id })
        .select('id', 'email', 'nome', 'perfis', 'createdAt')
        .update({ perfis: updatedPerfis });

      if (
        currentUser.perfis?.includes(Perfil.MASSAGISTA) &&
        !updatedPerfis.includes(Perfil.MASSAGISTA)
      ) {
        await tx.orm.public.MassagistaMassagem.where({ usuarioId: id }).delete();
      }

      return updatedUser;
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const returnedPerfis = user.perfis ?? [];
    return { ...user, perfil: returnedPerfis[0], perfis: returnedPerfis };
  }
}
