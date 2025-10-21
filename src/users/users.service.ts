import { ConflictException, Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { User } from './entities/user.entity';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm'
import { UpdateUserDto } from './dto/update-user.dto';
import { UserChangeLog } from './entities/user-change-log.entity';
import { UserRole } from 'src/common/enums';

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
    const user = await this.usersRepository.create(registerDto);
    return await this.usersRepository.save(user);
  }

  async giveNewRole(actionedUserId : number, actionerUserId : number, newRole: UserRole) : Promise<UserChangeLog> {
    const currentUserRole = await this.getCurrentRole(actionedUserId);
    if (currentUserRole === newRole) {
      throw new ConflictException(`User ID#${actionedUserId} already have ${currentUserRole} role!`)
    }
    const actionedUser = this.getUserById(actionedUserId);
    const actionerUser = this.getUserById(actionerUserId);
    const userRoleLog = this.usersLogRepository.create({
      newRole: newRole,
      actioner: await actionerUser,
      actioned: await actionedUser
    });
    
    return await this.usersLogRepository.save(userRoleLog)
  }
  // ---------------------------------- Create Methods -------------------------------------

  // ---------------------------------- Update Methods -------------------------------------
  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.preload({
      id,
      ...updateUserDto
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return await this.usersRepository.save(user);
  }
  // ---------------------------------- Update Methods -------------------------------------

  // ---------------------------------- Delete Methods -------------------------------------
  async deleteUser(id: number): Promise<void> {
    const user = await this.usersRepository.delete(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
  }
  // ---------------------------------- Delete Methods -------------------------------------

  // ---------------------------------- Get Methods -------------------------------------
  async getCurrentRole(userId: number): Promise<UserRole> {
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

  async getUsersByUsernamePart(username: string): Promise<User[]> {
    const users = await this.usersRepository.find({
      where: {username: Like(`%${username}%`)}
    });
    if (!users) {
      throw new NotFoundException(`Users with '${username}' not found`);
    }
    return users;
  }

  async getUserByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({where: {username }});
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
    const user = await this.usersRepository.findOne({where: { id }});
    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }
    return user;
  }

  async getAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }
  // ---------------------------------- Get Methods -------------------------------------
  
  async usersHealthcheck(): Promise<object> {
    return {message: "Users Controller is running!"};
  }
}
