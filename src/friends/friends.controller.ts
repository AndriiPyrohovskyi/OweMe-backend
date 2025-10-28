import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { FriendshipRequest } from './entities/friendship-request.entity';
import { User } from 'src/users/entities/user.entity';
import { Roles, CurrentUser, TargetUserField, FriendRequestRole } from 'src/common/decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/common/enums';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('healthcheck')
  @ApiOperation({ summary: 'Перевірка стану Friends сервісу' })
  @ApiResponse({ status: 200, description: 'Сервіс працює' })
  friendsHealthcheck(): object {
    return this.friendsService.friendsHealthcheck();
  }

  // ---------------------------------- Get -------------------------------------
  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Отримати всі дружби (тільки для адміністраторів)' })
  @ApiResponse({ status: 200, description: 'Список всіх дружб' })
  @ApiResponse({ status: 403, description: 'Доступ заборонений' })
  async getAllFriendships(): Promise<object[]> {
    return this.friendsService.getAllFriendships();
  }

  @Get('user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Отримати всіх друзів користувача' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Список друзів', type: [User] })
  @ApiResponse({ status: 404, description: 'Користувач не знайдений' })
  async getAllUserFriends(@Param('targetUserId') targetUserId: number): Promise<User[]> {
    return this.friendsService.getAllUserFriends(targetUserId);
  }

  @Get('common')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Отримати спільних друзів двох користувачів' })
  @ApiQuery({ name: 'targetUserId', description: 'ID першого користувача' })
  @ApiQuery({ name: 'targetedUserId', description: 'ID другого користувача' })
  @ApiResponse({ status: 200, description: 'Список спільних друзів', type: [User] })
  async getAllCommonUsersFriends(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<User[]> {
    return this.friendsService.getAllCommonUsersFriends(targetUserId, targetedUserId);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Отримати всі запити на дружбу (тільки для адміністраторів)' })
  @ApiResponse({ status: 200, description: 'Список всіх запитів' })
  @ApiResponse({ status: 403, description: 'Доступ заборонений' })
  async getAllFriendshipRequests(): Promise<object[]> {
    return this.friendsService.getAllFriendshipRequests();
  }

  @Get('requests/user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Отримати всі запити користувача (надіслані та отримані)' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Об\'єкт з надісланими та отриманими запитами' })
  async getAllFriendshipRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<object> {
    return this.friendsService.getAllFriendshipRequestsByUser(targetUserId);
  }

  @Get('requests/sent/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Отримати надіслані запити користувача' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Список надісланих запитів' })
  async getAllFriendshipRequestsSendedByUser(@Param('targetUserId') targetUserId: number): Promise<object[]> {
    return this.friendsService.getAllFriendshipRequestsSendedByUser(targetUserId);
  }

  @Get('requests/received/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Отримати отримані запити користувача' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Список отриманих запитів' })
  async getAllFriendshipRequestsReceivedByUser(@Param('targetUserId') targetUserId: number): Promise<object[]> {
    return this.friendsService.getAllFriendshipRequestsReceivedByUser(targetUserId);
  }

  @Get('check-friends')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Перевірити чи є користувачі друзями' })
  @ApiQuery({ name: 'targetUserId', description: 'ID першого користувача' })
  @ApiQuery({ name: 'targetedUserId', description: 'ID другого користувача' })
  @ApiResponse({ status: 200, description: 'true якщо друзі, false якщо ні' })
  async checkIfUsersAreFriends(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<boolean> {
    return this.friendsService.checkIfUsersAreFriends(targetUserId, targetedUserId);
  }

  @Get('friend-count/:id')
  @ApiOperation({ summary: 'Отримати кількість друзів користувача' })
  @ApiParam({ name: 'id', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Кількість друзів' })
  async getFriendCount(@Param('id') id: number): Promise<number> {
    return this.friendsService.getFriendCount(id);
  }

  @Get('check-request')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Перевірити чи існує запит на дружбу між користувачами' })
  @ApiQuery({ name: 'targetUserId', description: 'ID першого користувача' })
  @ApiQuery({ name: 'targetedUserId', description: 'ID другого користувача' })
  @ApiResponse({ status: 200, description: 'true якщо запит існує, false якщо ні' })
  async checkIfFriendRequestExists(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<boolean> {
    return this.friendsService.checkIfFriendRequestExists(targetUserId, targetedUserId);
  }

  // ---------------------------------- Post ------------------------------------
  @Post('send-request')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Надіслати запит на дружбу' })
  @ApiBody({ schema: { properties: { recevierId: { type: 'number' } } } })
  @ApiResponse({ status: 201, description: 'Запит надіслано' })
  @ApiResponse({ status: 400, description: 'Невірні дані або запит вже існує' })
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
  @ApiOperation({ summary: 'Прийняти запит на дружбу' })
  @ApiParam({ name: 'id', description: 'ID запиту на дружбу' })
  @ApiResponse({ status: 200, description: 'Запит прийнято' })
  @ApiResponse({ status: 404, description: 'Запит не знайдений' })
  @ApiResponse({ status: 403, description: 'Немає прав на виконання операції' })
  async acceptFriendRequest(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<object> {
    return this.friendsService.acceptFriendRequest(id, currentUser.id);
  }

  @Put('accept-all/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Прийняти всі запити на дружбу користувача' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Всі запити прийнято', type: [FriendshipRequest] })
  async acceptAllFriendRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<FriendshipRequest[]> {
    return this.friendsService.acceptAllFriendRequestsByUser(targetUserId);
  }

  @Put('decline-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @ApiOperation({ summary: 'Відхилити запит на дружбу' })
  @ApiParam({ name: 'id', description: 'ID запиту на дружбу' })
  @ApiResponse({ status: 200, description: 'Запит відхилено', type: FriendshipRequest })
  @ApiResponse({ status: 404, description: 'Запит не знайдений' })
  async declineFriendRequest(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<FriendshipRequest> {
    return this.friendsService.declineFriendRequest(id, currentUser.id);
  }

  @Put('decline-all/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Відхилити всі запити на дружбу користувача' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Всі запити відхилено', type: [FriendshipRequest] })
  async declineAllFriendRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<FriendshipRequest[]> {
    return this.friendsService.declineAllFriendRequestsByUser(targetUserId);
  }

  @Put('cancel-request/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @ApiOperation({ summary: 'Скасувати надісланий запит на дружбу' })
  @ApiParam({ name: 'id', description: 'ID запиту на дружбу' })
  @ApiResponse({ status: 200, description: 'Запит скасовано', type: FriendshipRequest })
  @ApiResponse({ status: 404, description: 'Запит не знайдений' })
  async cancelFriendRequest(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<FriendshipRequest> {
    return this.friendsService.cancelFriendRequest(id, currentUser.id);
  }

  @Put('cancel-all/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Скасувати всі надіслані запити користувача' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Всі запити скасовано', type: [FriendshipRequest] })
  async cancelAllFriendRequestsByUser(@Param('targetUserId') targetUserId: number): Promise<FriendshipRequest[]> {
    return this.friendsService.cancelAllFriendRequestsByUser(targetUserId);
  }

  // ---------------------------------- Delete ----------------------------------

  @Delete('remove-friend')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Видалити друга' })
  @ApiQuery({ name: 'targetUserId', description: 'ID першого користувача' })
  @ApiQuery({ name: 'targetedUserId', description: 'ID другого користувача' })
  @ApiResponse({ status: 200, description: 'Друг видалений' })
  @ApiResponse({ status: 404, description: 'Дружба не знайдена' })
  async removeFriend(
    @Query('targetUserId') targetUserId: number,
    @Query('targetedUserId') targetedUserId: number,
  ): Promise<void> {
    return this.friendsService.removeFriend(targetUserId, targetedUserId);
  }

}
