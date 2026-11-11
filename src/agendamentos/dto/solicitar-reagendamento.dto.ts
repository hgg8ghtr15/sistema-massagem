import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SolicitarReagendamentoDto {
  @ApiProperty({ example: '2027-03-10T12:00:00-04:00' })
  @IsDateString()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  dataHoraSugerida: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}
