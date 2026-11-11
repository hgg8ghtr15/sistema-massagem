import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ResponderReagendamentoDto {
  @ApiProperty({ example: true, description: 'Aprovar ou recusar a solicitação' })
  @IsBoolean()
  aprovar: boolean;
}
