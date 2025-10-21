import { IsString } from "class-validator";

export class UpdateUserDto{
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    username: string;

    @IsString()
    passwordHash: string;

    @IsString()
    email: string;

    @IsString()
    avatarUrl: string;
    
    @IsString()
    description: string;
}