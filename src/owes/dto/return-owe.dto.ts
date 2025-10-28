import { IsNumber, IsNotEmpty } from 'class-validator';

export class ReturnOweDto {
  @IsNumber()
  @IsNotEmpty()
  participantId: number;

  @IsNumber()
  @IsNotEmpty()
  returned: number;
}
