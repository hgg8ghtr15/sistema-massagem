import { validate } from 'class-validator';
import { Perfil } from '../perfil.enum';
import { UpdatePerfisDto } from './update-perfil.dto';

describe('UpdatePerfisDto', () => {
  function criarDto(perfis: string[]): UpdatePerfisDto {
    return Object.assign(new UpdatePerfisDto(), { perfis });
  }

  it('accepts one or more valid profiles', async () => {
    const errors = await validate(
      criarDto([Perfil.CLIENTE, Perfil.MASSAGISTA]),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects an empty profile list', async () => {
    const errors = await validate(criarDto([]));

    expect(errors).not.toHaveLength(0);
  });

  it('rejects unknown profiles', async () => {
    const errors = await validate(criarDto(['SUPERADMIN']));

    expect(errors).not.toHaveLength(0);
  });
});
