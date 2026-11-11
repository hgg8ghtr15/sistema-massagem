import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Perfil } from '../../usuarios/perfil.enum';

interface UsuarioAutenticado {
  perfis?: string[];
}

@Injectable()
export class GestorAgendamentoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>();
    const perfis = request.user?.perfis ?? [];
    if (
      !perfis.includes(Perfil.ADMIN) &&
      !perfis.includes(Perfil.ADMINISTRATIVO)
    ) {
      throw new ForbiddenException(
        'Somente administradores e administrativos podem executar esta operação.',
      );
    }

    return true;
  }
}
