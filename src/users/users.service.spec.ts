import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserChangeLog } from './entities/user-change-log.entity';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserRole } from '../common/enums';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
  let usersLogRepository: Repository<UserChangeLog>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    description: 'Test description',
    changeLogsIn: [],
    changeLogsOut: [],
  };

  const mockUsersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
  };

  const mockUsersLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(UserChangeLog),
          useValue: mockUsersLogRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    usersLogRepository = module.get<Repository<UserChangeLog>>(getRepositoryToken(UserChangeLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create and return a new user', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockUsersRepository.create.mockReturnValue({ ...mockUser, ...registerDto });
      mockUsersRepository.save.mockResolvedValue({ ...mockUser, ...registerDto });

      const result = await service.createUser(registerDto);

      expect(result).toBeDefined();
      expect(mockUsersRepository.create).toHaveBeenCalled();
      expect(mockUsersRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['changeLogsIn', 'changeLogsOut'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFullUserByUsername', () => {
    it('should return user by username', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getFullUserByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        relations: ['changeLogsIn', 'changeLogsOut'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.getFullUserByUsername('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserByEmail('nonexistent@example.com'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update and return user', async () => {
      const updateDto = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUsersRepository.preload.mockResolvedValue(updatedUser);
      mockUsersRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUser(1, updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersRepository.preload).toHaveBeenCalledWith({
        id: 1,
        ...updateDto,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.preload.mockResolvedValue(null);

      await expect(service.updateUser(999, { firstName: 'Test' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return public user data', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUsersRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteUser(1);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        avatarUrl: mockUser.avatarUrl,
        description: mockUser.description,
      });
      expect(mockUsersRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('giveNewRole', () => {
    it('should create role change log', async () => {
      const actioner = { ...mockUser, id: 2 };
      const roleLog = {
        id: 1,
        newRole: UserRole.Admin,
        actioner,
        actioned: mockUser,
      };

      mockUsersRepository.findOne
        .mockResolvedValueOnce({ ...mockUser, changeLogsIn: [] })
        .mockResolvedValueOnce(actioner);
      mockUsersLogRepository.create.mockReturnValue(roleLog);
      mockUsersLogRepository.save.mockResolvedValue(roleLog);

      const result = await service.giveNewRole(1, 2, UserRole.Admin);

      expect(result).toEqual(roleLog);
      expect(mockUsersLogRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already has the role', async () => {
      const userWithRole = {
        ...mockUser,
        changeLogsIn: [{ newRole: UserRole.Admin }],
      };

      mockUsersRepository.findOne.mockResolvedValue(userWithRole);

      await expect(service.giveNewRole(1, 2, UserRole.Admin))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('getAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      mockUsersRepository.find.mockResolvedValue(users);

      const result = await service.getAll();

      expect(result).toEqual(users);
      expect(mockUsersRepository.find).toHaveBeenCalled();
    });
  });

  describe('usersHealthcheck', () => {
    it('should return health check message', async () => {
      const result = await service.usersHealthcheck();
      expect(result).toEqual({ message: 'Users Controller is running!' });
    });
  });

  describe('getUserCurrentRole', () => {
    it('should return latest role from change logs', async () => {
      const userWithLogs = {
        ...mockUser,
        changeLogsIn: [
          { newRole: UserRole.User },
          { newRole: UserRole.Admin },
        ],
      };

      mockUsersRepository.findOne.mockResolvedValue(userWithLogs);

      const result = await service.getUserCurrentRole(1);

      expect(result).toBe(UserRole.Admin);
    });

    it('should return User role if no change logs', async () => {
      mockUsersRepository.findOne.mockResolvedValue({ ...mockUser, changeLogsIn: [] });

      const result = await service.getUserCurrentRole(1);

      expect(result).toBe(UserRole.User);
    });
  });

  describe('getPublicUsersByUsernamePart', () => {
    it('should return public user data matching username part', async () => {
      mockUsersRepository.find.mockResolvedValue([mockUser]);

      const result = await service.getPublicUsersByUsernamePart('test');

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('testuser');
      expect(result[0].firstName).toBe('Test');
      expect(result[0].lastName).toBe('User');
    });
  });
});
