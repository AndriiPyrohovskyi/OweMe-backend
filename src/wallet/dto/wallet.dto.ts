import { IsNumber, IsPositive, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepositDto {
    @ApiProperty({ 
        description: 'Amount to deposit in USD',
        example: 100.00,
        minimum: 1,
        maximum: 10000
    })
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(10000)
    amount: number;

    @ApiProperty({ 
        description: 'Payment method ID from Stripe',
        example: 'pm_1234567890'
    })
    @IsString()
    paymentMethodId: string;

    @ApiProperty({ 
        description: 'Optional description',
        example: 'Top-up wallet',
        required: false
    })
    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateTransferDto {
    @ApiProperty({ 
        description: 'Recipient user ID',
        example: 123
    })
    @IsNumber()
    @IsPositive()
    toUserId: number;

    @ApiProperty({ 
        description: 'Amount to transfer',
        example: 50.00,
        minimum: 0.01
    })
    @IsNumber()
    @IsPositive()
    @Min(0.01)
    amount: number;

    @ApiProperty({ 
        description: 'Optional description',
        example: 'Payment for lunch',
        required: false
    })
    @IsOptional()
    @IsString()
    description?: string;
}

export class PayDebtDto {
    @ApiProperty({ 
        description: 'Full Owe ID to pay',
        example: 456
    })
    @IsNumber()
    @IsPositive()
    oweId: number;

    @ApiProperty({ 
        description: 'Amount to pay (can be partial)',
        example: 25.00,
        minimum: 0.01
    })
    @IsNumber()
    @IsPositive()
    @Min(0.01)
    amount: number;

    @ApiProperty({ 
        description: 'Optional description',
        example: 'Partial payment',
        required: false
    })
    @IsOptional()
    @IsString()
    description?: string;
}
