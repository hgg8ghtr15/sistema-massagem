import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail({}, { message: 'Email deve ser válido' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(1, { message: 'Senha é obrigatória' })
  senha: string;
}