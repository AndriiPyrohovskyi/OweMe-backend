import { Controller, Get } from '@nestjs/common';
import { OwesService } from './owes.service';

@Controller()
export class OwesController {
  constructor(private readonly owesService: OwesService) {}

  @Get('healthcheck')
  owesHealthcheck(): object {
    return this.owesService.owesHealthcheck();
  }
}