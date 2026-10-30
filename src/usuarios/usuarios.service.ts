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
      perfil: Perfil.CLIENTE,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        perfil: user.perfil,
        createdAt: user.createdAt,
      },
      token: this.authService.createAccessToken(user.id, user.email),
    };
  }

  async updatePerfil(id: number, perfil: Perfil) {
    const user = await db.orm.public.Usuario.where({ id })
      .select('id', 'email', 'nome', 'perfil', 'createdAt')
      .update({ perfil });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }
}
