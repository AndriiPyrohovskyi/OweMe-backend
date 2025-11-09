import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateDepositDto, CreateTransferDto, PayDebtDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import { User } from '../users/entities/user.entity';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    @Get()
    @ApiOperation({ summary: 'Get user wallet' })
    @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
    @ApiBearerAuth()
    async getWallet(@CurrentUser() user: User) {
        return this.walletService.getWallet(user.id);
    }

    @Post('deposit')
    @ApiOperation({ summary: 'Deposit money via Stripe' })
    @ApiResponse({ status: 201, description: 'Deposit successful' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiBearerAuth()
    async deposit(@CurrentUser() user: User, @Body() depositDto: CreateDepositDto, @Request() req) {
        const ipAddress = req.ip;
        return this.walletService.deposit(user.id, depositDto, ipAddress);
    }

    @Post('transfer')
    @ApiOperation({ summary: 'Transfer money to another user' })
    @ApiResponse({ status: 201, description: 'Transfer successful' })
    @ApiResponse({ status: 400, description: 'Insufficient funds or invalid user' })
    @ApiBearerAuth()
    async transfer(@CurrentUser() user: User, @Body() transferDto: CreateTransferDto, @Request() req) {
        const ipAddress = req.ip;
        return this.walletService.transfer(user.id, transferDto, ipAddress);
    }

    @Post('pay-debt')
    @ApiOperation({ summary: 'Pay debt using wallet balance' })
    @ApiResponse({ status: 201, description: 'Payment successful' })
    @ApiResponse({ status: 400, description: 'Insufficient funds' })
    @ApiBearerAuth()
    async payDebt(@CurrentUser() user: User, @Body() payDebtDto: PayDebtDto, @Request() req) {
        const ipAddress = req.ip;
        return this.walletService.payDebt(user.id, payDebtDto, ipAddress);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Get transaction history' })
    @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
    @ApiBearerAuth()
    async getTransactions(
        @CurrentUser() user: User,
        @Query('limit') limit = 50,
        @Query('offset') offset = 0,
    ) {
        return this.walletService.getTransactions(user.id, +limit, +offset);
    }

    @Get('balance')
    @ApiOperation({ summary: 'Get wallet balance' })
    @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
    @ApiBearerAuth()
    async getBalance(@CurrentUser() user: User) {
        const wallet = await this.walletService.getWallet(user.id);
        return {
            balance: wallet.balance,
            currency: wallet.currency,
            status: wallet.status,
        };
    }
}
