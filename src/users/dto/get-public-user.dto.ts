import { IsNumber, IsString } from "class-validator";

export class GetPublicUserDto{
    @IsNumber()
    id: number

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    username: string;

    @IsString()
    avatarUrl: string;
    
    @IsString()
    description: string;
}