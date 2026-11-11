import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

export class ReagendarAgendamentoDto {
  @ApiProperty({ example: '2027-03-10T12:00:00-04:00' })
  @IsDateString()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  dataHora: string;
}
