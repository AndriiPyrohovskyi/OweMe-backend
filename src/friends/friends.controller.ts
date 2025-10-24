import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { Friendship } from './entities/friendship.entity';
import { FriendshipRequest } from './entities/friendship-request.entity';
import { User } from 'src/users/entities/user.entity';
import { Roles } from 'src/common/decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/common/enums';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('healthcheck')
  friendsHealthcheck(): object {
    return this.friendsService.friendsHealthcheck();
  }

  // ---------------------------------- Get -------------------------------------
  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async getAllFriendships(): Promise<object[]> {
    return this.friendsService.getAllFriendships();
  }

  @Get('user/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getAllUserFriends(@Param('id') id: number): Promise<User[]> {
    return this.friendsService.getAllUserFriends(id);
  }

  @Get('common')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getAllCommonUsersFriends(
    @Query('id1') id1: number,
    @Query('id2') id2: number,
  ): Promise<User[]> {
    return this.friendsService.getAllCommonUsersFriends(id1, id2);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getAllFriendshipRequests(): Promise<FriendshipRequest[]> {
    return this.friendsService.getAllFriendshipRequests();
  }

  @Get('requests/user/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getAllFriendshipRequestsByUser(@Param('id') id: number): Promise<FriendshipRequest[]> {
    return this.friendsService.getAllFriendshipRequestsByUser(id);
  }

  @Get('requests/sent/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getAllFriendshipRequestsSendedByUser(@Param('id') id: number): Promise<FriendshipRequest[]> {
    return this.friendsService.getAllFriendshipRequestsSendedByUser(id);
  }

  @Get('requests/received/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getAllFriendshipRequestsReceivedByUser(@Param('id') id: number): Promise<FriendshipRequest[]> {
    return this.friendsService.getAllFriendshipRequestsReceivedByUser(id);
  }

  @Get('check-friends')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async checkIfUsersAreFriends(
    @Query('id1') id1: number,
    @Query('id2') id2: number,
  ): Promise<boolean> {
    return this.friendsService.checkIfUsersAreFriends(id1, id2);
  }

  @Get('friend-count/:id')
  async getFriendCount(@Param('id') id: number): Promise<number> {
    return this.friendsService.getFriendCount(id);
  }

  @Get('check-request')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async checkIfFriendRequestExists(
    @Query('id1') id1: number,
    @Query('id2') id2: number,
  ): Promise<boolean> {
    return this.friendsService.checkIfFriendRequestExists(id1, id2);
  }

  // ---------------------------------- Post ------------------------------------
  @Post('send-request')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async sendFriendRequest(
    @Body() body: { senderId: number; recevierId: number },
  ): Promise<FriendshipRequest> {
    return this.friendsService.sendFriendRequest(body.senderId, body.recevierId);
  }

  // ---------------------------------- Put -------------------------------------
  @Put('accept-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async acceptFriendRequest(@Param('id') id: number): Promise<Friendship> {
    return this.friendsService.acceptFriendRequest(id);
  }

  @Put('accept-all/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async acceptAllFriendRequestsByUser(@Param('id') id: number): Promise<Friendship[]> {
    return this.friendsService.acceptAllFriendRequestsByUser(id);
  }

  @Put('decline-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async declineFriendRequest(@Param('id') id: number): Promise<FriendshipRequest> {
    return this.friendsService.declineFriendRequest(id);
  }

  @Put('decline-all/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async declineAllFriendRequestsByUser(@Param('id') id: number): Promise<Friendship[]> {
    return this.friendsService.declineAllFriendRequestsByUser(id);
  }

  @Put('cancel-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async cancelFriendRequest(@Param('id') id: number): Promise<FriendshipRequest> {
    return this.friendsService.cancelFriendRequest(id);
  }

  @Put('cancel-all/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async cancelAllFriendRequestsByUser(@Param('id') id: number): Promise<Friendship[]> {
    return this.friendsService.cancelAllFriendRequestsByUser(id);
  }

  // ---------------------------------- Delete ----------------------------------
  
  @Delete('remove-friend')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async removeFriend(
    @Query('id1') id1: number,
    @Query('id2') id2: number,
  ): Promise<void> {
    return this.friendsService.removeFriend(id1, id2);
  }
}