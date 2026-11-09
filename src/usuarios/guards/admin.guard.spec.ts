import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { Perfil } from '../perfil.enum';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function createContext(perfis: string[]): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { perfis } }),
      }),
    } as ExecutionContext;
  }

  it('allows administrators', () => {
    expect(guard.canActivate(createContext([Perfil.ADMIN, Perfil.MASSAGISTA]))).toBe(true);
  });

  it.each([Perfil.CLIENTE, Perfil.ADMINISTRATIVO, Perfil.MASSAGISTA])(
    'rejects users with only the %s profile',
    (perfil) => {
      expect(() => guard.canActivate(createContext([perfil]))).toThrow(
        ForbiddenException,
      );
    },
  );

  it('rejects users without profiles', () => {
    expect(() => guard.canActivate(createContext([]))).toThrow(ForbiddenException);
  });
});
