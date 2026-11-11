import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class HorariosLivresDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  massagemId: number;

  @ApiProperty({ example: '2027-03-10', description: 'Data local no fuso configurado' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data: string;

  @ApiPropertyOptional({ example: 2, description: 'Omitir para qualquer disponível' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  massagistaId?: number;
}
