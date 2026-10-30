import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { db } from '../prisma/db';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

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

    const token = this.createAccessToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        perfil: user.perfil,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async validateUser(userId: number, tokenId: string) {
    const revokedToken = await db.orm.public.TokenRevogado.where({
      jti: tokenId,
    }).first();

    if (revokedToken) {
      throw new UnauthorizedException('Token revogado');
    }

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
      perfil: user.perfil,
      createdAt: user.createdAt,
    };
  }

  async logout(tokenId: string, tokenExpiresAt: number) {
    const now = new Date().toISOString();
    await db.orm.public.TokenRevogado.where((token) =>
      token.expiresAt.lt(now),
    ).delete();

    await db.orm.public.TokenRevogado.create({
      jti: tokenId,
      expiresAt: new Date(tokenExpiresAt * 1000).toISOString(),
    });

    return { message: 'Logout realizado com sucesso' };
  }

  createAccessToken(userId: number, email: string): string {
    const payload = { sub: userId, email, jti: randomUUID() };
    return this.jwtService.sign(payload);
  }
}
