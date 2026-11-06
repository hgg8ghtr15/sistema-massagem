import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, IsInt, Min, IsOptional } from "class-validator";

export class CreateMassagemDto {
    @ApiProperty({ example: 'Massagem relaxante', maxLength: 100 })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    nome: string;

    @ApiProperty({ example: 'Técnica para relaxamento muscular.' })
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    descricao: string;

    @ApiProperty({ example: 60, description: 'Duração em minutos' })
    @IsInt()
    @Min(1)
    duracaoMinutos: number;

    @ApiProperty({
        example: 15000,
        description: 'Valor em centavos (15000 = R$ 150,00)',
    })
    @IsInt()
    @Min(0)
    valorCentavos: number;

    @ApiPropertyOptional({ example: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    youtubeUrl?: string;
}