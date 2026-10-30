import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Perfil } from '../perfil.enum';

export class UpdatePerfilDto {
  @ApiProperty({ enum: Perfil, example: Perfil.MASSAGISTA })
  @IsEnum(Perfil, { message: 'Perfil inválido' })
  perfil: Perfil;
}
