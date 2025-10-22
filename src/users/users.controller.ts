import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/common/decorators';
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
  async getAll(): Promise<GetPublicUserDto[]> {
    return this.usersService.getAll();
  }

  @Get('userRole')
  async getCurrentRole(@Body() username: string): Promise<UserRole> {
    const user = await this.usersService.getUserByUsername(username);
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
  @UseGuards(RolesGuard)
  @Role(UserRole.Admin)
  async giveNewRole(@Body() actionedUsername: string, actionerUsername: string, newRole: UserRole) : Promise<object>{
    const actionedUser = await this.usersService.getUserByUsername(actionedUsername);
    const actionerUser = await this.usersService.getUserByUsername(actionerUsername);
    this.usersService.giveNewRole(actionedUser.id, actionerUser.id, newRole);

    return {message: `${actionedUsername}'s role succesfully changed to ${newRole} by ${actionerUsername}`}
  }
  // ---------------------------------- Post -------------------------------------

  // ---------------------------------- Put -------------------------------------
  @Put('user')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Role(UserRole.Admin)
  async updateUser(@Body() id: number, updateUserDto: UpdateUserDto) : Promise<object> {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return{message: `${user.username}'s entity was succesfully updated!`}
  }
  // ---------------------------------- Put -------------------------------------
  
  // ---------------------------------- Delete -------------------------------------
  @Delete('user')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Role(UserRole.Admin)
  async deleteUser(@Body() id: number) : Promise<object> {
    const user = await this.usersService.deleteUser(id);
    return{message: `${user.username}'s entity was succesfully deleted!`}
  }
  // ---------------------------------- Delete -------------------------------------

}