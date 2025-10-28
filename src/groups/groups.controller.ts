import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';
import { Roles, CurrentUser, TargetUserField } from 'src/common/decorators';
import { GroupsUserRole, UserRole } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { Group } from './entities/group.entity';
import { RequestToGroup } from './entities/request-to-group.entity';
import { RequestFromGroup } from './entities/request-from-group.entity';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('healthcheck')
  @ApiOperation({ summary: 'Перевірка стану Groups сервісу' })
  @ApiResponse({ status: 200, description: 'Сервіс працює' })
  groupsHealthcheck(): object {
    return this.groupsService.groupsHealthcheck();
  }

  // ---------------------------------- Get -------------------------------------
  @Get('my-groups')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати мої групи' })
  @ApiResponse({ status: 200, description: 'Список груп поточного користувача', type: [Group] })
  async getMyGroups(@CurrentUser() currentUser: User): Promise<Group[]> {
    return this.groupsService.getUserGroups(currentUser.id);
  }

  @Get('user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  @ApiOperation({ summary: 'Отримати групи користувача' })
  @ApiParam({ name: 'targetUserId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Список груп користувача', type: [Group] })
  async getUserGroups(@Param('targetUserId') targetUserId: number): Promise<Group[]> {
    return this.groupsService.getUserGroups(targetUserId);
  }

  @Get(':groupId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати групу за ID' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Інформація про групу', type: Group })
  @ApiResponse({ status: 404, description: 'Група не знайдена' })
  async getGroupById(@Param('groupId') groupId: number): Promise<Group> {
    return this.groupsService.getGroupById(groupId);
  }

  @Get(':groupId/requests/to')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати запити на вступ до групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Список запитів до групи', type: [RequestToGroup] })
  async getRequestsToGroup(@Param('groupId') groupId: number): Promise<RequestToGroup[]> {
    return this.groupsService.getRequestsToGroupByGroupId(groupId);
  }

  @Get(':groupId/requests/from')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати запрошення від групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Список запрошень від групи', type: [RequestFromGroup] })
  async getRequestsFromGroup(@Param('groupId') groupId: number): Promise<RequestFromGroup[]> {
    return this.groupsService.getRequestsFromGroupByGroupId(groupId);
  }

  @Get('requests/to/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати мої запити на вступ до груп' })
  @ApiResponse({ status: 200, description: 'Список моїх запитів до груп', type: [RequestToGroup] })
  async getMyRequestsToGroups(@CurrentUser() currentUser: User): Promise<RequestToGroup[]> {
    return this.groupsService.getRequestsToGroupByUserId(currentUser.id);
  }

  @Get('requests/from/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати мої запрошення від груп' })
  @ApiResponse({ status: 200, description: 'Список моїх запрошень від груп', type: [RequestFromGroup] })
  async getMyRequestsFromGroups(@CurrentUser() currentUser: User): Promise<RequestFromGroup[]> {
    return this.groupsService.getRequestsFromGroupByUserId(currentUser.id);
  }

  // ---------------------------------- Get -------------------------------------

  // ---------------------------------- Post ------------------------------------
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Створити нову групу' })
  @ApiBody({ type: CreateGroupDto })
  @ApiResponse({ status: 201, description: 'Група успішно створена', type: Group })
  @ApiResponse({ status: 400, description: 'Невірні дані' })
  async createGroup(
    @CurrentUser() currentUser: User,
    @Body() createGroupDto: CreateGroupDto
  ): Promise<Group> {
    return this.groupsService.createGroup(currentUser.id, createGroupDto);
  }

  @Post('request/to/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Надіслати запит на вступ до групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 201, description: 'Запит надіслано', type: RequestToGroup })
  @ApiResponse({ status: 409, description: 'Конфлікт - користувач вже в групі або запит існує' })
  async sendJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number
  ): Promise<RequestToGroup> {
    return this.groupsService.sendJoinRequestToGroup(currentUser.id, groupId);
  }

  @Post('request/from/:groupId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Надіслати запрошення в групу від імені групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiBody({ schema: { properties: { receiverId: { type: 'number' } } } })
  @ApiResponse({ status: 201, description: 'Запрошення надіслано', type: RequestFromGroup })
  @ApiResponse({ status: 403, description: 'Тільки адміністратори можуть надсилати запрошення' })
  async sendJoinRequestFromGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number,
    @Body() body: { receiverId: number }
  ): Promise<RequestFromGroup> {
    return this.groupsService.sendJoinRequestFromGroup(currentUser.id, groupId, body.receiverId);
  }

  // ---------------------------------- Post ------------------------------------

  // ---------------------------------- Put -------------------------------------
  @Put('request/to/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Прийняти запит на вступ до групи' })
  @ApiParam({ name: 'requestId', description: 'ID запиту' })
  @ApiResponse({ status: 200, description: 'Запит прийнято' })
  @ApiResponse({ status: 403, description: 'Тільки адміністратори можуть приймати запити' })
  async acceptJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.acceptJoinRequestToGroup(currentUser.id, requestId);
  }

  @Put('request/to/:groupId/accept-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Прийняти всі запити на вступ до групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Всі запити прийнято' })
  async acceptAllJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number
  ): Promise<void> {
    return this.groupsService.acceptAllJoinRequestToGroup(currentUser.id, groupId);
  }

  @Put('request/from/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Прийняти запрошення від групи' })
  @ApiParam({ name: 'requestId', description: 'ID запрошення' })
  @ApiResponse({ status: 200, description: 'Запрошення прийнято' })
  async acceptJoinRequestFromGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.acceptJoinRequestFromGroup(requestId, currentUser.id);
  }

  @Put('request/from/accept-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Прийняти всі запрошення від груп' })
  @ApiResponse({ status: 200, description: 'Всі запрошення прийнято' })
  async acceptAllJoinRequestFromGroups(@CurrentUser() currentUser: User): Promise<void> {
    return this.groupsService.acceptAllJoinRequestFromGroups(currentUser.id);
  }

  @Put('request/to/:requestId/decline')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Відхилити запит на вступ до групи' })
  @ApiParam({ name: 'requestId', description: 'ID запиту' })
  @ApiResponse({ status: 200, description: 'Запит відхилено' })
  async declineJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.declineJoinRequestToGroup(currentUser.id, requestId);
  }

  @Put('request/to/:groupId/decline-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Відхилити всі запити на вступ до групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Всі запити відхилено' })
  async declineAllJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number
  ): Promise<void> {
    return this.groupsService.declineAllJoinRequestToGroup(currentUser.id, groupId);
  }

  @Put('request/from/:requestId/decline')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Відхилити запрошення від групи' })
  @ApiParam({ name: 'requestId', description: 'ID запрошення' })
  @ApiResponse({ status: 200, description: 'Запрошення відхилено' })
  async declineJoinRequestFromGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.declineJoinRequestFromGroup(requestId, currentUser.id);
  }

  @Put('request/from/decline-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Відхилити всі запрошення від груп' })
  @ApiResponse({ status: 200, description: 'Всі запрошення відхилено' })
  async declineAllJoinRequestFromGroups(@CurrentUser() currentUser: User): Promise<void> {
    return this.groupsService.declineAllJoinRequestFromGroups(currentUser.id);
  }

  @Put('request/to/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Скасувати запит на вступ до групи' })
  @ApiParam({ name: 'requestId', description: 'ID запиту' })
  @ApiResponse({ status: 200, description: 'Запит скасовано' })
  async cancelJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.cancelJoinRequestToGroup(requestId, currentUser.id);
  }

  @Put('request/to/cancel-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Скасувати всі запити на вступ до груп' })
  @ApiResponse({ status: 200, description: 'Всі запити скасовано' })
  async cancelAllJoinRequestToGroups(@CurrentUser() currentUser: User): Promise<void> {
    return this.groupsService.cancelAllJoinRequestToGroupsByUser(currentUser.id);
  }

  @Put('request/from/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Скасувати запрошення від групи' })
  @ApiParam({ name: 'requestId', description: 'ID запрошення' })
  @ApiResponse({ status: 200, description: 'Запрошення скасовано' })
  async cancelJoinRequestFromGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.cancelJoinRequestFromGroup(currentUser.id, requestId);
  }

  @Put('request/from/:groupId/cancel-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Скасувати всі запрошення від групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Всі запрошення скасовано' })
  async cancelAllJoinRequestFromGroups(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number
  ): Promise<void> {
    return this.groupsService.cancelAllJoinRequestFromGroups(currentUser.id, groupId);
  }

  // ---------------------------------- Put -------------------------------------

  // ---------------------------------- Delete ----------------------------------
  @Delete(':groupId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Видалити групу' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Група видалена' })
  @ApiResponse({ status: 403, description: 'Тільки засновник може видалити групу' })
  async deleteGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number): Promise<void> {
    const groupMember = await this.groupsService.getGroupMemberByGroupAndUser(groupId, currentUser.id);
    if (groupMember.role != GroupsUserRole.Founder) {
      throw new ForbiddenException('You aren`t fonder of group!')
    }
    return this.groupsService.deleteGroup(groupId);
  }

  @Delete(':groupId/member/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Видалити учасника з групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiParam({ name: 'userId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Учасник видалений' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async deleteGroupMember(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number,
    @Param('userId') userId: number
  ): Promise<void> {
    return this.groupsService.deleteGroupMember(userId, groupId, currentUser.id);
  }

  // ---------------------------------- Delete ----------------------------------
}
