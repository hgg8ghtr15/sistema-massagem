import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { db } from '../prisma/db';
import { Perfil } from './perfil.enum';
import { RegisterDto } from './dto/register.dto';

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
