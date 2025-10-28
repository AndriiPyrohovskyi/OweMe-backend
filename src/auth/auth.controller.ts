import { Body, Controller, Get, Post, UseGuards, Request} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {Roles} from 'src/common/decorators'
import { UserRole } from 'src/common/enums';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('healthcheck')
  @ApiOperation({ summary: 'Перевірка стану Auth сервісу' })
  @ApiResponse({ status: 200, description: 'Сервіс працює' })
  authHealthcheck(): object {
    return this.authService.authHealthcheck();
  }

  @Post('login')
  @ApiOperation({ summary: 'Вхід користувача' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Успішний вхід', schema: { 
    properties: { accessToken: { type: 'string' } } 
  }})
  @ApiResponse({ status: 401, description: 'Невірні облікові дані' })
  async login(@Body() loginDto: LoginDto) : Promise<{ accessToken: string}> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Реєстрація нового користувача' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Користувач успішно зареєстрований' })
  @ApiResponse({ status: 400, description: 'Невірні дані або користувач вже існує' })
  async register(@Body() registerDto: RegisterDto) : Promise<any> {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отримати профіль поточного користувача' })
  @ApiResponse({ status: 200, description: 'Профіль користувача' })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  async getProfile(@Request() req): Promise<any> {
    return req.user;
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Тестовий ендпоінт для адміністраторів' })
  @ApiResponse({ status: 200, description: 'Адмін дані' })
  @ApiResponse({ status: 403, description: 'Доступ заборонений' })
  async getAdminData(): Promise<string> {
    return 'This is admin data!';
  }
}