import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateGroupDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    tag: string;

    @IsOptional()
    @IsString()
    avatarUrl: string;

    @IsOptional()
    @IsString()
    description: string;
}