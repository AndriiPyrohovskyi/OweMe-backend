import { BadRequestException, ConflictException, Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { User } from './entities/user.entity';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm'
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

    private readonly dataSource: DataSource,
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
  async banUser(adminId: number, userId: number, reason?: string): Promise<User> {
    if (adminId === userId) {
      throw new BadRequestException('You cannot ban yourself');
    }
    
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

  async resetFields(userId: number): Promise<User> {
    const user = await this.getUserById(userId);
    user.firstName = 'User';
    user.lastName = '';
    user.description = '';
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

  async getAdminStats(userId: number) {
    const friendsCountQuery = await this.dataSource.query(
      `SELECT COUNT(DISTINCT CASE 
        WHEN "senderId" = $1 THEN "receiverId"
        WHEN "receiverId" = $1 THEN "senderId"
      END) as count
      FROM "FriendshipRequest"
      WHERE ("senderId" = $1 OR "receiverId" = $1) AND "requestStatus" = 'Accepted'`,
      [userId],
    );
    const totalFriends = parseInt(friendsCountQuery[0]?.count || '0');

    const groupsCountQuery = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM "GroupMember" WHERE "userId" = $1`,
      [userId],
    );
    const totalGroups = parseInt(groupsCountQuery[0]?.count || '0');

    const sentOwesQuery = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM "FullOwe" WHERE "fromUserId" = $1`,
      [userId],
    );
    const sentOwes = parseInt(sentOwesQuery[0]?.count || '0');

    const receivedOwesQuery = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM "OweParticipant" WHERE "toUserId" = $1`,
      [userId],
    );
    const receivedOwes = parseInt(receivedOwesQuery[0]?.count || '0');

    const totalDebtQuery = await this.dataSource.query(
      `SELECT COALESCE(SUM(op.sum), 0) as total
      FROM "OweParticipant" op
      INNER JOIN "OweItem" oi ON op."oweItemId" = oi.id
      INNER JOIN "FullOwe" fo ON oi."fullOweId" = fo.id
      WHERE op."toUserId" = $1 AND op.status != 'Closed'`,
      [userId],
    );
    const totalDebt = parseFloat(totalDebtQuery[0]?.total || '0');

    const totalLentQuery = await this.dataSource.query(
      `SELECT COALESCE(SUM(op.sum), 0) as total
      FROM "OweParticipant" op
      INNER JOIN "OweItem" oi ON op."oweItemId" = oi.id
      INNER JOIN "FullOwe" fo ON oi."fullOweId" = fo.id
      WHERE fo."fromUserId" = $1 AND op.status != 'Closed'`,
      [userId],
    );
    const totalLent = parseFloat(totalLentQuery[0]?.total || '0');

    const user = await this.getUserById(userId);

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      description: user.description,
      isBanned: user.isBanned,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
      createdAt: user.createdAt,
      role: await this.getUserCurrentRole(userId),
      stats: {
        totalFriends,
        totalGroups,
        sentOwes,
        receivedOwes,
        totalDebt,
        totalLent,
      },
    };
  }
  // ---------------------------------- Get Methods -------------------------------------
  
  async usersHealthcheck(): Promise<object> {
    return {message: "Users Controller is running!"};
  }
}
