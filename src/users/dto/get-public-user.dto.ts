import { IsString } from "class-validator";

export class GetPublicUserDto{
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