import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Вітальне повідомлення API' })
  @ApiResponse({ status: 200, description: 'API працює' })
  getHello(): object {
    return this.appService.getHello();
  }
}
