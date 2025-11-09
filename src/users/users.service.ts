import { ConflictException, Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { User } from './entities/user.entity';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm'
import { UpdateUserDto } from './dto/update-user.dto';
import { UserChangeLog } from './entities/user-change-log.entity';
import { UserRole } from 'src/common/enums';
import { GetPublicUserDto } from './dto/get-public-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(UserChangeLog)
    private readonly usersLogRepository: Repository<UserChangeLog>,
  ) {}

  // ---------------------------------- Create Methods -------------------------------------
  async createUser(registerDto: RegisterDto): Promise<User> {
    let { password ,...data} = registerDto;
    const user = this.usersRepository.create({ ...data, passwordHash: password });
    return await this.usersRepository.save(user);
  }

  async giveNewRole(actionedUserId: number, actionerUserId: number, newRole: UserRole): Promise<UserChangeLog> {
    const currentUserRole = await this.getUserCurrentRole(actionedUserId);
    if (currentUserRole === newRole) {
      throw new ConflictException(`User ID#${actionedUserId} already have ${currentUserRole} role!`);
    }

    const actionedUser = await this.getUserById(actionedUserId);
    const actionerUser = await this.getUserById(actionerUserId);

    const userRoleLog = this.usersLogRepository.create({
      newRole: newRole,
      actioner: actionerUser,
      actioned: actionedUser
    });

    return await this.usersLogRepository.save(userRoleLog);
  }
  // ---------------------------------- Create Methods -------------------------------------

  // ---------------------------------- Update Methods -------------------------------------
  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.preload({
      id,
      ...updateUserDto,
    });
  
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
  
    return await this.usersRepository.save(user);
  }
  // ---------------------------------- Update Methods -------------------------------------

  // ---------------------------------- Delete Methods -------------------------------------
  async deleteUser(id: number): Promise<GetPublicUserDto> {
    const user = await this.getUserById(id);
    await this.usersRepository.delete(id);
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      description: user.description,
    };
  }
  // ---------------------------------- Delete Methods -------------------------------------

  // ---------------------------------- Ban Methods -------------------------------------
  async banUser(userId: number, reason?: string): Promise<User> {
    const user = await this.getUserById(userId);
    user.isBanned = true;
    user.banReason = reason || 'No reason provided';
    user.bannedAt = new Date();
    return await this.usersRepository.save(user);
  }

  async unbanUser(userId: number): Promise<User> {
    const user = await this.getUserById(userId);
    user.isBanned = false;
    user.banReason = undefined;
    user.bannedAt = undefined;
    return await this.usersRepository.save(user);
  }
  // ---------------------------------- Ban Methods -------------------------------------

  // ---------------------------------- Get Methods -------------------------------------
  async getUserCurrentRole(userId: number): Promise<UserRole> {
    const currentUser = await this.getUserById(userId);
    const currentUserRole = currentUser.changeLogsIn[currentUser.changeLogsIn.length - 1]?.newRole || UserRole.User;
    return currentUserRole;
  }
  async getUserInLogs(userId: number) : Promise<UserChangeLog[]> {
    const userInLogs = await this.usersLogRepository.find({where: { actioned: { id: userId } }});
    return userInLogs;
  }

  async getUserOutLogs(userId: number) : Promise<UserChangeLog[]> {
    const userInLogs = await this.usersLogRepository.find({where: { actioner: { id: userId } }});
    return userInLogs;
  }

  async getPublicUsersByUsernamePart(username: string): Promise<GetPublicUserDto[]> {
    const users = await this.usersRepository.find({
      where: {username: Like(`%${username}%`)}
    });
    if (!users) {
      throw new NotFoundException(`Users with '${username}' not found`);
    }
    return users.map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      description: user.description,
    }));
  }

  async getPublicUserByUsername(username: string): Promise<GetPublicUserDto> {
    const user = await this.usersRepository.findOne({
      where: { username },
      relations: ['changeLogsIn', 'changeLogsOut']
    });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found`);
    }
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      description: user.description,
    };
  }

  async getFullUsersByUsernamePart(username: string): Promise<User[]> {
    const users = await this.usersRepository.find({
      where: {username: Like(`%${username}%`)}
    });
    if (!users) {
      throw new NotFoundException(`Users with '${username}' not found`);
    }
    return users;
  }

  async getFullUserByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { username },
      relations: ['changeLogsIn', 'changeLogsOut']
    });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found`);
    }
    return user;
  }


  async getUserByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({where: { email }});
    if (!user) {
      throw new NotFoundException(`User with email '${email}' not found`);
    }
    return user;
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['changeLogsIn', 'changeLogsOut']
    });
    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }
    return user;
  }

  async getAll(): Promise<GetPublicUserDto[]> {
    return await this.usersRepository.find();
  }
  // ---------------------------------- Get Methods -------------------------------------
  
  async usersHealthcheck(): Promise<object> {
    return {message: "Users Controller is running!"};
  }
}
