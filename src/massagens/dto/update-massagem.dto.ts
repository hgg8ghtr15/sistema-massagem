import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class UpdateMassagemDto {
    @ApiPropertyOptional({ example: 'Massagem relaxante', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    nome?: string;

    @ApiPropertyOptional({ example: 'Técnica para relaxamento muscular.' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    descricao?: string;

    @ApiPropertyOptional({ example: 60 })
    @IsOptional()
    @IsInt()
    @Min(1)
    duracaoMinutos?: number;

    @ApiPropertyOptional({ example: 15000, description: 'Valor em centavos' })
    @IsOptional()
    @IsInt()
    @Min(0)
    valorCentavos?: number;
}