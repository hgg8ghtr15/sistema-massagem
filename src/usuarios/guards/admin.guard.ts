import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Perfil } from '../perfil.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { perfil?: string } }>();

    if (request.user?.perfil !== Perfil.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem alterar perfis');
    }

    return true;
  }
}
