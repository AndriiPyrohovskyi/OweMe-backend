import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456', // Mock bcrypt hash
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    description: null,
  };

  const mockUsersService = {
    getFullUserByUsername: jest.fn(),
    createUser: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      mockUsersService.getFullUserByUsername.mockResolvedValue(mockUser);
      
      // Mock bcrypt compare to return true
      jest.spyOn(service as any, 'comparePasswords').mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toBeDefined();
      expect(result.passwordHash).toBeUndefined();
      expect(result.username).toBe('testuser');
      expect(mockUsersService.getFullUserByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.getFullUserByUsername.mockResolvedValue(null);

      await expect(service.validateUser('wronguser', 'password123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUsersService.getFullUserByUsername.mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'comparePasswords').mockResolvedValue(false);

      await expect(service.validateUser('testuser', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const loginDto = { username: 'testuser', password: 'password123' };
      const mockToken = 'mock.jwt.token';

      jest.spyOn(service, 'validateUser').mockResolvedValue({
        id: 1,
        username: 'testuser',
      });
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({ accessToken: mockToken });
      expect(service.validateUser).toHaveBeenCalledWith('testuser', 'password123');
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'testuser',
        sub: 1,
      });
    });
  });

  describe('register', () => {
    it('should create new user and return user without password', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const createdUser = { ...mockUser, id: 2, username: 'newuser' };
      mockUsersService.createUser.mockResolvedValue(createdUser);
      jest.spyOn(service as any, 'hashPassword').mockResolvedValue('hashedPassword');

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.passwordHash).toBeUndefined();
      expect(result.username).toBe('newuser');
      expect(mockUsersService.createUser).toHaveBeenCalled();
    });
  });

  describe('authHealthcheck', () => {
    it('should return health check message', () => {
      const result = service.authHealthcheck();
      expect(result).toEqual({ message: 'Auth Controller is running!' });
    });
  });
});
