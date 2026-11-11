import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CriarAgendamentoDto {
  @ApiProperty({ example: '2027-03-10T10:00:00-04:00' })
  @IsDateString()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  dataHora: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  massagemId: number;

  @ApiPropertyOptional({ example: 2, description: 'Omitir para qualquer disponível' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  massagistaId?: number;

  @ApiPropertyOptional({ example: 3, description: 'Somente para perfis administrativos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}
