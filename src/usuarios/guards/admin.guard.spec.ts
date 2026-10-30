import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { Perfil } from '../perfil.enum';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  function createContext(perfil: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { perfil } }),
      }),
    } as ExecutionContext;
  }

  it('allows administrators', () => {
    expect(guard.canActivate(createContext(Perfil.ADMIN))).toBe(true);
  });

  it.each([Perfil.CLIENTE, Perfil.ADMINISTRATIVO, Perfil.MASSAGISTA])(
    'rejects the %s profile',
    (perfil) => {
      expect(() => guard.canActivate(createContext(perfil))).toThrow(
        ForbiddenException,
      );
    },
  );
});
