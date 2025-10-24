import { Controller, Get } from '@nestjs/common';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('healthcheck')
  friendsHealthcheck(): object {
    return this.friendsService.friendsHealthcheck();
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