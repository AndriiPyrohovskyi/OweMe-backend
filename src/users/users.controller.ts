import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators';
import { UserRole } from 'src/common/enums';
import { UserChangeLog } from './entities/user-change-log.entity';
import { GetPublicUserDto } from './dto/get-public-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';

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
  async getCurrentRole(@Query('username') username: string): Promise<UserRole> {
    const user = await this.usersService.getUserByUsername(username);
    return this.usersService.getUserCurrentRole(user.id);
  }

  @Get('userInLogs')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getUserInLogs(@Query('username') username: string): Promise<UserChangeLog[]> {
    const user = await this.usersService.getUserByUsername(username);
    return this.usersService.getUserInLogs(user.id);
  }

  @Get('userOutLogs')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async getUserOutLogs(@Query('username') username: string): Promise<UserChangeLog[]> {
    const user = await this.usersService.getUserByUsername(username);
    return this.usersService.getUserOutLogs(user.id);
  }

  @Get('usersByUsernamePart')
  async getUsersByUsernamePart(@Query('username') username: string): Promise<GetPublicUserDto[]> {
    return this.usersService.getUsersByUsernamePart(username);
  }

  @Get('userByUsername')
  async getUserByUsername(@Query('username') username: string): Promise<GetPublicUserDto> {
    return this.usersService.getUserByUsername(username);
  }
  // ---------------------------------- Get -------------------------------------

  // ---------------------------------- Post -------------------------------------
  @Post('userGiveNewRole')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async giveNewRole(@Body() body: {actionedUsername: string; actionerUsername: string; newRole: UserRole}): Promise<object> {
    const actionedUser = await this.usersService.getUserByUsername(body.actionedUsername);
    const actionerUser = await this.usersService.getUserByUsername(body.actionerUsername);
    await this.usersService.giveNewRole(actionedUser.id, actionerUser.id, body.newRole);
    return {message: `${body.actionedUsername}'s role successfully changed to ${body.newRole} by ${body.actionerUsername}`}
  }
  // ---------------------------------- Post -------------------------------------

  // ---------------------------------- Put -------------------------------------
  @Put('user/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<object> {
    const user = await this.usersService.updateUser(parseInt(id), updateUserDto);
    return { message: `${user.username}'s entity was successfully updated!` };
  }
  // ---------------------------------- Put -------------------------------------
  
  // ---------------------------------- Delete -------------------------------------
  @Delete('user/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Roles(UserRole.Admin)
  async deleteUser(@Param('id') id: string) : Promise<object> {
    const user = await this.usersService.deleteUser(parseInt(id));
    return{message: `${user.username}'s entity was succesfully deleted!`}
  }
  // ---------------------------------- Delete -------------------------------------

}