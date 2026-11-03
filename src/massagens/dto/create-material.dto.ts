import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateMaterialDto {
    @ApiProperty({ example: 'Óleo de amêndoas', maxLength: 100 })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    nome: string;

    @ApiPropertyOptional({ example: 'Óleo vegetal para massagem.' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    descricao?: string;
}