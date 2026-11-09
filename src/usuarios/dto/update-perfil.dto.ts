import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';
import { Perfil } from '../perfil.enum';

export class UpdatePerfilDto {
  @ApiProperty({ enum: Perfil, example: Perfil.MASSAGISTA })
  @IsEnum(Perfil, { message: 'Perfil inválido' })
  perfil: Perfil;
}

export class UpdatePerfisDto {
  @ApiProperty({ enum: Perfil, isArray: true, example: [Perfil.MASSAGISTA] })
  @IsArray({ message: 'Perfis deve ser uma lista' })
  @ArrayNotEmpty({ message: 'O usuário deve ter ao menos um perfil' })
  @IsEnum(Perfil, {
    each: true,
    message: 'A lista contém um perfil inválido',
  })
  perfis: Perfil[];
}
