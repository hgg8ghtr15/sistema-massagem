import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { db } from '../prisma/db';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(dto: { email: string; nome: string; senha: string }) {
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
    });

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async login(dto: { email: string; senha: string }) {
    const user = await db.orm.public.Usuario.where({
      email: dto.email,
    }).first();

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.senha, user.senha);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async validateUser(userId: number) {
    const user = await db.orm.public.Usuario.first({
      id: userId,
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      createdAt: user.createdAt,
    };
  }

  private generateToken(userId: number, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
