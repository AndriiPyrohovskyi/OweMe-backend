import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles, CurrentUser, TargetUserField } from 'src/common/decorators';
import { UserRole } from 'src/common/enums';
import { UserChangeLog } from './entities/user-change-log.entity';
import { GetPublicUserDto } from './dto/get-public-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ---------------------------------- Get -------------------------------------
  @Get('healthcheck')
  async usersHealthcheck(): Promise<object> {
    return this.usersService.usersHealthcheck();
  }

  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async getAll(): Promise<GetPublicUserDto[]> {
    return this.usersService.getAll();
  }

  @Get('userRole')
  async getCurrentRole(@Query('targetUserId') targetUserId: number): Promise<UserRole> {
    return this.usersService.getUserCurrentRole(targetUserId);
  }

  @Get('userInLogs')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getUserInLogs(@Query('targetUserId') targetUserId: number): Promise<UserChangeLog[]> {
    return this.usersService.getUserInLogs(targetUserId);
  }

  @Get('userOutLogs')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async getUserOutLogs(@Query('targetUserId') targetUserId: number): Promise<UserChangeLog[]> {
    return this.usersService.getUserOutLogs(targetUserId);
  }

  @Get('publicUsersByUsernamePart')
  async getPublicUsersByUsernamePart(@Query('username') username: string): Promise<GetPublicUserDto[]> {
    return this.usersService.getPublicUsersByUsernamePart(username);
  }

  @Get('publicUserByUsername')
  async getPublicUserByUsername(@Query('username') username: string): Promise<GetPublicUserDto> {
    return this.usersService.getPublicUserByUsername(username);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('fullUsersByUsernamePart')
  async getFullUsersByUsernamePart(@Query('username') username: string): Promise<GetPublicUserDto[]> {
    return this.usersService.getFullUsersByUsernamePart(username);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('fullUserByUsername')
  async getFullUserByUsername(@Query('username') username: string): Promise<GetPublicUserDto> {
    return this.usersService.getFullUserByUsername(username);
  }

  @Get(':id/admin-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async getAdminStats(@Param('id') userId: string) {
    return this.usersService.getAdminStats(parseInt(userId));
  }
  // ---------------------------------- Get -------------------------------------

  // ---------------------------------- Post -------------------------------------
  @Post('userGiveNewRole')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async giveNewRole(@Body() body: {actionedUsername: string; actionerUsername: string; newRole: UserRole}): Promise<object> {
    const actionedUser = await this.usersService.getFullUserByUsername(body.actionedUsername);
    const actionerUser = await this.usersService.getFullUserByUsername(body.actionerUsername);
    await this.usersService.giveNewRole(actionedUser.id, actionerUser.id, body.newRole);
    return {message: `${body.actionedUsername}'s role successfully changed to ${body.newRole} by ${body.actionerUsername}`}
  }

  @Post('banUser')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async banUser(@CurrentUser() currentUser: User, @Body() body: { userId: number; reason?: string }): Promise<object> {
    const user = await this.usersService.banUser(currentUser.id, body.userId, body.reason);
    return { message: `User ${user.username} has been banned` };
  }

  @Post('unbanUser')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async unbanUser(@Body() body: { userId: number }): Promise<object> {
    const user = await this.usersService.unbanUser(body.userId);
    return { message: `User ${user.username} has been unbanned` };
  }

  @Post(':id/reset-fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async resetFields(@Param('id') userId: string): Promise<object> {
    await this.usersService.resetFields(parseInt(userId));
    return { message: 'User fields have been reset to defaults' };
  }
  // ---------------------------------- Post -------------------------------------

  // ---------------------------------- Put -------------------------------------
  @Put('user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('targetUserId')
  async updateUser(
    @Param('targetUserId') targetUserId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<object> {
    const user = await this.usersService.updateUser(parseInt(targetUserId), updateUserDto);
    return { message: `${user.username}'s entity was successfully updated!` };
  }
  // ---------------------------------- Put -------------------------------------
  
  // ---------------------------------- Delete -------------------------------------
  @Delete('user/:targetUserId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @TargetUserField('targetUserId')
  async deleteUser(@Param('targetUserId') targetUserId: string) : Promise<object> {
    const user = await this.usersService.deleteUser(parseInt(targetUserId));
    return{message: `${user.username}'s entity was succesfully deleted!`}
  }
  // ---------------------------------- Delete -------------------------------------
}