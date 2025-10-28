import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendshipRequest } from './entities/friendship-request.entity';
import { User } from 'src/users/entities/user.entity';
import { Roles, CurrentUser, TargetUserField, FriendRequestRole } from 'src/common/decorators';
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

  @Get('user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getAllUserFriends(@Param('targetUserId') targetUserId: number): Promise<User[]> {
    return this.friendsService.getAllUserFriends(targetUserId);
  }

  @Get('common')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getAllCommonUsersFriends(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<User[]> {
    return this.friendsService.getAllCommonUsersFriends(targetUserId, targetedUserId);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async getAllFriendshipRequests(): Promise<object[]> {
    return this.friendsService.getAllFriendshipRequests();
  }

  @Get('requests/user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getAllFriendshipRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<object> {
    return this.friendsService.getAllFriendshipRequestsByUser(targetUserId);
  }

  @Get('requests/sent/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getAllFriendshipRequestsSendedByUser(@Param('targetUserId') targetUserId: number): Promise<object[]> {
    return this.friendsService.getAllFriendshipRequestsSendedByUser(targetUserId);
  }

  @Get('requests/received/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getAllFriendshipRequestsReceivedByUser(@Param('targetUserId') targetUserId: number): Promise<object[]> {
    return this.friendsService.getAllFriendshipRequestsReceivedByUser(targetUserId);
  }

  @Get('check-friends')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async checkIfUsersAreFriends(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<boolean> {
    return this.friendsService.checkIfUsersAreFriends(targetUserId, targetedUserId);
  }

  @Get('friend-count/:id')
  async getFriendCount(@Param('id') id: number): Promise<number> {
    return this.friendsService.getFriendCount(id);
  }

  @Get('check-request')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async checkIfFriendRequestExists(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<boolean> {
    return this.friendsService.checkIfFriendRequestExists(targetUserId, targetedUserId);
  }

  // ---------------------------------- Post ------------------------------------
  @Post('send-request')
  @UseGuards(JwtAuthGuard)
  async sendFriendRequest(
    @CurrentUser() currentUser: User,
    @Body() body: { recevierId: number },
  ): Promise<object> {
    return this.friendsService.sendFriendRequest(currentUser.id, body.recevierId);
  }

  // ---------------------------------- Put -------------------------------------
  @Put('accept-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @FriendRequestRole('receiver')
  async acceptFriendRequest(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<object> {
    return this.friendsService.acceptFriendRequest(id, currentUser.id);
  }

  @Put('accept-all/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async acceptAllFriendRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<FriendshipRequest[]> {
    return this.friendsService.acceptAllFriendRequestsByUser(targetUserId);
  }

  @Put('decline-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async declineFriendRequest(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<FriendshipRequest> {
    return this.friendsService.declineFriendRequest(id, currentUser.id);
  }

  @Put('decline-all/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async declineAllFriendRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<FriendshipRequest[]> {
    return this.friendsService.declineAllFriendRequestsByUser(targetUserId);
  }

  @Put('cancel-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async cancelFriendRequest(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<FriendshipRequest> {
    return this.friendsService.cancelFriendRequest(id, currentUser.id);
  }

  @Put('cancel-all/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async cancelAllFriendRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<FriendshipRequest[]> {
    return this.friendsService.cancelAllFriendRequestsByUser(targetUserId);
  }

  // ---------------------------------- Delete ----------------------------------

  @Delete('remove-friend')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async removeFriend(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<void> {
    return this.friendsService.removeFriend(targetUserId, targetedUserId);
  }
}