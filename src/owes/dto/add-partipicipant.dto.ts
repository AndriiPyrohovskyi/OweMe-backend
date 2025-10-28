import { IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class AddParticipantDto {
  @IsNumber()
  @IsNotEmpty()
  oweItemId: number;

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
