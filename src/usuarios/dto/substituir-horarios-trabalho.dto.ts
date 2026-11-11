import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class HorarioTrabalhoDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6, description: 'Domingo = 0; sábado = 6' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'O início deve estar no formato HH:mm',
  })
  inicio: string;

  @ApiProperty({ example: '12:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'O fim deve estar no formato HH:mm',
  })
  fim: string;
}

export class SubstituirHorariosTrabalhoDto {
  @ApiProperty({ type: HorarioTrabalhoDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioTrabalhoDto)
  horarios: HorarioTrabalhoDto[];
}
