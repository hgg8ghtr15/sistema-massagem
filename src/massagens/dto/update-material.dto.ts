import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateMaterialDto {
    @ApiPropertyOptional({ example: 'Óleo de amêndoas', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    nome?: string;

    @ApiPropertyOptional({ example: 'Óleo vegetal para massagem.' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descricao?: string;
}
