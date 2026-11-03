import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAtivoDto {
    @ApiProperty({ example: false })
    @IsBoolean()
    ativo: boolean;
}