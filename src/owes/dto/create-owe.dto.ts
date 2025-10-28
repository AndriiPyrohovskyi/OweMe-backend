import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOweParticipantDto {
  @IsNumber()
  @IsNotEmpty()
  sum: number;

  @IsNumber()
  @IsOptional()
  toUserId?: number;

  @IsNumber()
  @IsOptional()
  groupId?: number;
}

export class CreateOweItemDto {
  @IsNumber()
  @IsNotEmpty()
  sum: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOweParticipantDto)
  participants: CreateOweParticipantDto[];
}

export class CreateOweDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsNotEmpty()
  fromUserId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOweItemDto)
  oweItems: CreateOweItemDto[];
}
