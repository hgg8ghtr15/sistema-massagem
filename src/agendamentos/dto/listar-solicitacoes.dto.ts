import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { StatusSolicitacaoReagendamento } from '../agendamento-status.enum';

export class ListarSolicitacoesDto {
  @ApiPropertyOptional({ enum: StatusSolicitacaoReagendamento })
  @IsOptional()
  @IsEnum(StatusSolicitacaoReagendamento)
  status?: StatusSolicitacaoReagendamento;

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
