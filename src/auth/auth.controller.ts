import { Body, Controller, Get, Post, UseGuards, Request} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {Role} from 'src/common/decorators'
import { UserRole } from 'src/common/enums';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('healthcheck')
  authHealthcheck(): object {
    return this.authService.authHealthcheck();
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) : Promise<{ accessToken: string}> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) : Promise<any> {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req): Promise<any> {
    return req.user;
  }

  @UseGuards(RolesGuard) // Застосовуємо RolesGuard
  @Role(UserRole.Admin) // Додаємо роль, яка має доступ
  @Get('admin')
  async getAdminData(): Promise<string> {
    return 'This is admin data!';
  }
}