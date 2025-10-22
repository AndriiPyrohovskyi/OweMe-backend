import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class DeleteUserDto{
    @IsString()
    @IsNotEmpty()
    id: number;
}