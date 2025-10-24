import { Controller, Get } from '@nestjs/common';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('healthcheck')
  groupsHealthcheck(): object {
    return this.groupsService.groupsHealthcheck();
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