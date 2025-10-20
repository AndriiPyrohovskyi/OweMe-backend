import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('healthcheck')
  authHealthcheck(): object {
    return this.authService.authHealthcheck();
  }
}