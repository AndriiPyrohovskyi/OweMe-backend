import { Controller, Get } from '@nestjs/common';
import { OwesService } from './owes.service';

@Controller('owes')
export class OwesController {
  constructor(private readonly owesService: OwesService) {}

  @Get('healthcheck')
  owesHealthcheck(): object {
    return this.owesService.getAllFullOwesByGroupMember(1, 4);
  }
  // ---------------------------------- Get -------------------------------------
  // ---------------------------------- Get -------------------------------------
  // ---------------------------------- Post ------------------------------------
  // ---------------------------------- Post ------------------------------------
  // ---------------------------------- Put -------------------------------------
  // ---------------------------------- Put -------------------------------------
  // ---------------------------------- Delete ----------------------------------
  // ---------------------------------- Delete ----------------------------------
}