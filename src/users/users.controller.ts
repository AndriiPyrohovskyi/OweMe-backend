import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators';
import { UserRole } from 'src/common/enums';
import { UserChangeLog } from './entities/user-change-log.entity';
import { GetPublicUserDto } from './dto/get-public-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';
import { DeleteUserDto } from './dto/delete-user.dto';

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
  async getCurrentRole(@Body() body: {username: string}): Promise<UserRole> {
    const user = await this.usersService.getUserByUsername(body.username);
    return this.usersService.getUserCurrentRole(user.id);
  }

  @Get('userInLogs')
  async getUserInLogs(@Body() username: string): Promise<UserChangeLog[]> {
    const user = await this.usersService.getUserByUsername(username);
    return this.usersService.getUserInLogs(user.id);
  }

  @Get('userOutLogs')
  async getUserOutLogs(@Body() username: string): Promise<UserChangeLog[]> {
    const user = await this.usersService.getUserByUsername(username);
    return this.usersService.getUserOutLogs(user.id);
  }

  @Get('userByUsernamePart')
  async getUsersByUsernamePart(@Body() username: string): Promise<GetPublicUserDto[]> {
    return this.usersService.getUsersByUsernamePart(username);
  }

  @Get('userByUsername')
  async getUserByUsername(@Body() username: string): Promise<GetPublicUserDto> {
    return this.usersService.getUserByUsername(username);
  }
  // ---------------------------------- Get -------------------------------------

  // ---------------------------------- Post -------------------------------------
  @Post('userGiveNewRole')
  async giveNewRole(@Body() body: {actionedUsername: string; actionerUsername: string; newRole: UserRole}) : Promise<object>{
    const actionedUser = await this.usersService.getUserByUsername(body.actionedUsername);
    const actionerUser = await this.usersService.getUserByUsername(body.actionerUsername);
    this.usersService.giveNewRole(actionedUser.id, actionerUser.id, body.newRole);
    return {message: `${body.actionedUsername}'s role succesfully changed to ${body.newRole} by ${body.actionerUsername}`}
  }
  // ---------------------------------- Post -------------------------------------

  // ---------------------------------- Put -------------------------------------
  @Put('user/:id')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<object> {
    const user = await this.usersService.updateUser(parseInt(id, 10), updateUserDto);
    return { message: `${user.username}'s entity was successfully updated!` };
  }
  // ---------------------------------- Put -------------------------------------
  
  // ---------------------------------- Delete -------------------------------------
  @Delete('user')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Roles(UserRole.Admin)
  async deleteUser(@Body() deleteUserDto: DeleteUserDto) : Promise<object> {
    const user = await this.usersService.deleteUser(deleteUserDto);
    return{message: `${user.username}'s entity was succesfully deleted!`}
  }
  // ---------------------------------- Delete -------------------------------------

}