import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, ForbiddenException } from '@nestjs/common';
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

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('healthcheck')
  groupsHealthcheck(): object {
    return this.groupsService.groupsHealthcheck();
  }

  // ---------------------------------- Get -------------------------------------
  @Get('my-groups')
  @UseGuards(JwtAuthGuard)
  async getMyGroups(@CurrentUser() currentUser: User): Promise<Group[]> {
    return this.groupsService.getUserGroups(currentUser.id);
  }

  @Get('user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getUserGroups(@Param('targetUserId') targetUserId: number): Promise<Group[]> {
    return this.groupsService.getUserGroups(targetUserId);
  }

  @Get(':groupId')
  @UseGuards(JwtAuthGuard)
  async getGroupById(@Param('groupId') groupId: number): Promise<Group> {
    return this.groupsService.getGroupById(groupId);
  }

  @Get(':groupId/requests/to')
  @UseGuards(JwtAuthGuard)
  async getRequestsToGroup(@Param('groupId') groupId: number): Promise<RequestToGroup[]> {
    return this.groupsService.getRequestsToGroupByGroupId(groupId);
  }

  @Get(':groupId/requests/from')
  @UseGuards(JwtAuthGuard)
  async getRequestsFromGroup(@Param('groupId') groupId: number): Promise<RequestFromGroup[]> {
    return this.groupsService.getRequestsFromGroupByGroupId(groupId);
  }

  @Get('requests/to/my')
  @UseGuards(JwtAuthGuard)
  async getMyRequestsToGroups(@CurrentUser() currentUser: User): Promise<RequestToGroup[]> {
    return this.groupsService.getRequestsToGroupByUserId(currentUser.id);
  }

  @Get('requests/from/my')
  @UseGuards(JwtAuthGuard)
  async getMyRequestsFromGroups(@CurrentUser() currentUser: User): Promise<RequestFromGroup[]> {
    return this.groupsService.getRequestsFromGroupByUserId(currentUser.id);
  }

  // ---------------------------------- Get -------------------------------------

  // ---------------------------------- Post ------------------------------------
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createGroup(
    @CurrentUser() currentUser: User,
    @Body() createGroupDto: CreateGroupDto
  ): Promise<Group> {
    return this.groupsService.createGroup(currentUser.id, createGroupDto);
  }

  @Post('request/to/:groupId')
  @UseGuards(JwtAuthGuard)
  async sendJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number
  ): Promise<RequestToGroup> {
    return this.groupsService.sendJoinRequestToGroup(currentUser.id, groupId);
  }

  @Post('request/from/:groupId')
  @UseGuards(JwtAuthGuard)
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
  async acceptJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.acceptJoinRequestToGroup(currentUser.id, requestId);
  }

  @Put('request/to/:groupId/accept-all')
  @UseGuards(JwtAuthGuard)
  async acceptAllJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number
  ): Promise<void> {
    return this.groupsService.acceptAllJoinRequestToGroup(currentUser.id, groupId);
  }

  @Put('request/from/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptJoinRequestFromGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.acceptJoinRequestFromGroup(requestId, currentUser.id);
  }

  @Put('request/from/accept-all')
  @UseGuards(JwtAuthGuard)
  async acceptAllJoinRequestFromGroups(@CurrentUser() currentUser: User): Promise<void> {
    return this.groupsService.acceptAllJoinRequestFromGroups(currentUser.id);
  }

  @Put('request/to/:requestId/decline')
  @UseGuards(JwtAuthGuard)
  async declineJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.declineJoinRequestToGroup(currentUser.id, requestId);
  }

  @Put('request/to/:groupId/decline-all')
  @UseGuards(JwtAuthGuard)
  async declineAllJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number
  ): Promise<void> {
    return this.groupsService.declineAllJoinRequestToGroup(currentUser.id, groupId);
  }

  @Put('request/from/:requestId/decline')
  @UseGuards(JwtAuthGuard)
  async declineJoinRequestFromGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.declineJoinRequestFromGroup(requestId, currentUser.id);
  }

  @Put('request/from/decline-all')
  @UseGuards(JwtAuthGuard)
  async declineAllJoinRequestFromGroups(@CurrentUser() currentUser: User): Promise<void> {
    return this.groupsService.declineAllJoinRequestFromGroups(currentUser.id);
  }

  @Put('request/to/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelJoinRequestToGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.cancelJoinRequestToGroup(requestId, currentUser.id);
  }

  @Put('request/to/cancel-all')
  @UseGuards(JwtAuthGuard)
  async cancelAllJoinRequestToGroups(@CurrentUser() currentUser: User): Promise<void> {
    return this.groupsService.cancelAllJoinRequestToGroupsByUser(currentUser.id);
  }

  @Put('request/from/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelJoinRequestFromGroup(
    @CurrentUser() currentUser: User,
    @Param('requestId') requestId: number
  ): Promise<void> {
    return this.groupsService.cancelJoinRequestFromGroup(currentUser.id, requestId);
  }

  @Put('request/from/:groupId/cancel-all')
  @UseGuards(JwtAuthGuard)
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
  async deleteGroupMember(
    @CurrentUser() currentUser: User,
    @Param('groupId') groupId: number,
    @Param('userId') userId: number
  ): Promise<void> {
    return this.groupsService.deleteGroupMember(userId, groupId, currentUser.id);
  }

  // ---------------------------------- Delete ----------------------------------
}