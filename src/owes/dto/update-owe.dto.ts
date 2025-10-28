import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { OweStatus } from 'src/common/enums';

export class UpdateOweDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsEnum(OweStatus)
  @IsOptional()
  status?: OweStatus;
}

export class UpdateOweItemDto {
  @IsNumber()
  @IsOptional()
  sum?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(OweStatus)
  @IsOptional()
  status?: OweStatus;
}

export class UpdateOweParticipantDto {
  @IsNumber()
  @IsOptional()
  sum?: number;
}
