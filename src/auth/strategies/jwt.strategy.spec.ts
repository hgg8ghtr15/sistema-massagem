import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const validateUser = jest.fn();

  beforeEach(async () => {
    validateUser.mockClear();
    validateUser.mockResolvedValue({
      id: 1,
      email: 'cliente@email.com',
      nome: 'Cliente',
      perfil: 'CLIENTE',
      createdAt: '2026-10-30T00:00:00.000Z',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'test-secret' } },
        { provide: AuthService, useValue: { validateUser } },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('validates the user and includes token revocation data', async () => {
    const user = await strategy.validate({
      sub: 1,
      email: 'cliente@email.com',
      jti: 'token-id',
      exp: 1_798_000_000,
    });

    expect(validateUser).toHaveBeenCalledWith(1, 'token-id');
    expect(user).toMatchObject({
      id: 1,
      tokenId: 'token-id',
      tokenExpiresAt: 1_798_000_000,
    });
  });

  it('rejects tokens without a revocation id', async () => {
    await expect(
      strategy.validate({
        sub: 1,
        email: 'cliente@email.com',
        jti: '',
        exp: 1_798_000_000,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
