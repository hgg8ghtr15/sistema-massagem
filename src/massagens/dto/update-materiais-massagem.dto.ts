import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsInt,
    IsString,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';

export class MaterialMassagemDto {
    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(1)
    materialId: number;

    @ApiProperty({ example: 10 })
    @IsInt()
    @Min(1)
    quantidade: number;

    @ApiProperty({ example: 'ml' })
    @IsString()
    @MinLength(1)
    @MaxLength(30)
    unidade: string;
}

export class UpdateMateriaisMassagemDto {
    @ApiProperty({ type: [MaterialMassagemDto] })
    @IsArray()
    @ArrayMaxSize(100)
    @ArrayUnique((item: MaterialMassagemDto) => item.materialId, {
        message: 'Não repita o mesmo material na lista',
    })
    @ValidateNested({ each: true })
    @Type(() => MaterialMassagemDto)
    materiais: MaterialMassagemDto[];
}