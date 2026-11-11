import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { StatusAgendamento } from '../agendamento-status.enum';

export class ListarAgendamentosDto {
  @ApiPropertyOptional({ example: '2027-03-10', description: 'Data local no fuso configurado' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  massagistaId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ enum: StatusAgendamento })
  @IsOptional()
  @IsEnum(StatusAgendamento)
  status?: StatusAgendamento;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
