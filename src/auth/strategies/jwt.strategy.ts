import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'sua-chave-secreta-super-segura',
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    jti: string;
    exp: number;
  }) {
    if (
      typeof payload.jti !== 'string' ||
      payload.jti.length === 0 ||
      typeof payload.exp !== 'number'
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.authService.validateUser(payload.sub, payload.jti);
    return {
      ...user,
      tokenId: payload.jti,
      tokenExpiresAt: payload.exp,
    };
  }
}