import { Test, TestingModule } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { RequestFromGroup } from './entities/request-from-group.entity';
import { RequestToGroup } from './entities/request-to-group.entity';
import { GroupRolesLog } from './entities/group-log.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupMessage } from './entities/group-message.entity';
import { MessageMention } from './entities/message-mention.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { GroupsUserRole, RequestStatus } from '../common/enums';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepository: Repository<Group>;
  let requestFromGroupRepository: Repository<RequestFromGroup>;
  let requestToGroupRepository: Repository<RequestToGroup>;
  let groupMemberRepository: Repository<GroupMember>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockGroup = {
    id: 1,
    name: 'Test Group',
    description: 'Test description',
    avatar: null,
  };

  const mockGroupMember = {
    id: 1,
    group: mockGroup,
    user: mockUser,
    role: GroupsUserRole.Founder,
  };

  const mockRequestToGroup = {
    id: 1,
    sender: mockUser,
    group: mockGroup,
    requestStatus: RequestStatus.Opened,
    actor: null,
    createdAt: new Date(),
    finishedAt: null,
  };

  const mockRepositories = {
    groupRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockGroup]),
      })),
    },
    requestFromGroupRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      manager: { findOne: jest.fn() },
    },
    requestToGroupRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      manager: { findOne: jest.fn() },
    },
    groupRolesLogRepository: {
      create: jest.fn(),
      save: jest.fn(),
    },
    groupMemberRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      manager: { findOne: jest.fn() },
    },
    groupMessageRepository: {
      create: jest.fn(),
      save: jest.fn(),
    },
    messageMentionRepository: {
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getRepositoryToken(Group),
          useValue: mockRepositories.groupRepository,
        },
        {
          provide: getRepositoryToken(RequestFromGroup),
          useValue: mockRepositories.requestFromGroupRepository,
        },
        {
          provide: getRepositoryToken(RequestToGroup),
          useValue: mockRepositories.requestToGroupRepository,
        },
        {
          provide: getRepositoryToken(GroupRolesLog),
          useValue: mockRepositories.groupRolesLogRepository,
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: mockRepositories.groupMemberRepository,
        },
        {
          provide: getRepositoryToken(GroupMessage),
          useValue: mockRepositories.groupMessageRepository,
        },
        {
          provide: getRepositoryToken(MessageMention),
          useValue: mockRepositories.messageMentionRepository,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupRepository = module.get(getRepositoryToken(Group));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('groupsHealthcheck', () => {
    it('should return health check message', () => {
      const result = service.groupsHealthcheck();
      expect(result).toEqual({ message: 'Groups Controller is running!' });
    });
  });

  describe('createGroup', () => {
    it('should create a new group with founder', async () => {
      const createGroupDto = {
        name: 'New Group',
        tag: 'new-group',
        avatarUrl: 'https://example.com/avatar.png',
        description: 'Description',
      };

      mockRepositories.groupMemberRepository.manager.findOne.mockResolvedValue(mockUser);
      mockRepositories.groupRepository.create.mockReturnValue(mockGroup);
      mockRepositories.groupRepository.save.mockResolvedValue(mockGroup);
      mockRepositories.groupMemberRepository.create.mockReturnValue(mockGroupMember);
      mockRepositories.groupMemberRepository.save.mockResolvedValue(mockGroupMember);
      mockRepositories.groupRolesLogRepository.create.mockReturnValue({});
      mockRepositories.groupRolesLogRepository.save.mockResolvedValue({});

      const result = await service.createGroup(1, createGroupDto);

      expect(result).toEqual(mockGroup);
      expect(mockRepositories.groupRepository.save).toHaveBeenCalled();
      expect(mockRepositories.groupMemberRepository.save).toHaveBeenCalled();
      expect(mockRepositories.groupRolesLogRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockRepositories.groupMemberRepository.manager.findOne.mockResolvedValue(null);

      await expect(service.createGroup(1, { 
        name: 'Test', 
        tag: 'test',
        avatarUrl: '',
        description: '' 
      }))
        .rejects.toThrow();
    });
  });

  describe('sendJoinRequestToGroup', () => {
    it('should send join request to group', async () => {
      jest.spyOn(service, 'getGroupById').mockResolvedValue(mockGroup as any);
      jest.spyOn(service, 'getUserGroups').mockResolvedValue([]);
      mockRepositories.requestToGroupRepository.manager.findOne.mockResolvedValue(mockUser);
      mockRepositories.requestToGroupRepository.findOne.mockResolvedValue(null);
      mockRepositories.requestToGroupRepository.create.mockReturnValue(mockRequestToGroup);
      mockRepositories.requestToGroupRepository.save.mockResolvedValue(mockRequestToGroup);

      const result = await service.sendJoinRequestToGroup(1, 1);

      expect(result).toEqual(mockRequestToGroup);
      expect(mockRepositories.requestToGroupRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user already in group', async () => {
      jest.spyOn(service, 'getGroupById').mockResolvedValue(mockGroup as any);
      jest.spyOn(service, 'getUserGroups').mockResolvedValue([mockGroup as any]);
      mockRepositories.requestToGroupRepository.manager.findOne.mockResolvedValue(mockUser);

      await expect(service.sendJoinRequestToGroup(1, 1)).rejects.toThrow();
    });

    it('should throw error if request already exists', async () => {
      jest.spyOn(service, 'getGroupById').mockResolvedValue(mockGroup as any);
      jest.spyOn(service, 'getUserGroups').mockResolvedValue([]);
      mockRepositories.requestToGroupRepository.manager.findOne.mockResolvedValue(mockUser);
      mockRepositories.requestToGroupRepository.findOne.mockResolvedValue(mockRequestToGroup);

      await expect(service.sendJoinRequestToGroup(1, 1)).rejects.toThrow();
    });
  });

  describe('acceptJoinRequestToGroup', () => {
    it('should accept join request to group', async () => {
      const mockAdminMember = { ...mockGroupMember, role: GroupsUserRole.Admin };

      jest.spyOn(service, 'getRequestToGroupById').mockResolvedValue(mockRequestToGroup as any);
      jest.spyOn(service, 'getGroupMemberByGroupAndUser').mockResolvedValue(mockAdminMember as any);
      mockRepositories.requestToGroupRepository.save.mockResolvedValue({
        ...mockRequestToGroup,
        requestStatus: RequestStatus.Accepted,
      });
      mockRepositories.groupMemberRepository.create.mockReturnValue({});
      mockRepositories.groupMemberRepository.save.mockResolvedValue({});

      await service.acceptJoinRequestToGroup(1, 1);

      expect(mockRepositories.requestToGroupRepository.save).toHaveBeenCalled();
      expect(mockRepositories.groupMemberRepository.save).toHaveBeenCalled();
    });

    it('should throw error if request not opened', async () => {
      const closedRequest = { ...mockRequestToGroup, requestStatus: RequestStatus.Accepted };
      jest.spyOn(service, 'getRequestToGroupById').mockResolvedValue(closedRequest as any);
      jest.spyOn(service, 'getGroupMemberByGroupAndUser').mockResolvedValue({
        ...mockGroupMember,
        role: GroupsUserRole.Admin,
      } as any);

      await expect(service.acceptJoinRequestToGroup(1, 1)).rejects.toThrow();
    });

    it('should throw error if user is just a member', async () => {
      const memberRole = { ...mockGroupMember, role: GroupsUserRole.Member };
      jest.spyOn(service, 'getRequestToGroupById').mockResolvedValue(mockRequestToGroup as any);
      jest.spyOn(service, 'getGroupMemberByGroupAndUser').mockResolvedValue(memberRole as any);

      await expect(service.acceptJoinRequestToGroup(1, 1)).rejects.toThrow();
    });
  });

  describe('declineJoinRequestToGroup', () => {
    it('should decline join request to group', async () => {
      const openedRequest = { ...mockRequestToGroup, requestStatus: RequestStatus.Opened };
      jest.spyOn(service, 'getRequestToGroupById').mockResolvedValue(openedRequest as any);
      jest.spyOn(service, 'getGroupMemberByGroupAndUser').mockResolvedValue({
        ...mockGroupMember,
        role: GroupsUserRole.Admin,
      } as any);
      mockRepositories.requestToGroupRepository.save.mockResolvedValue({
        ...openedRequest,
        requestStatus: RequestStatus.Declined,
        finishedAt: new Date(),
      });

      await service.declineJoinRequestToGroup(1, 1);

      expect(mockRepositories.requestToGroupRepository.save).toHaveBeenCalled();
    });
  });

  describe('cancelJoinRequestToGroup', () => {
    it('should cancel join request to group', async () => {
      const openedRequest = { ...mockRequestToGroup, requestStatus: RequestStatus.Opened };
      jest.spyOn(service, 'getRequestToGroupById').mockResolvedValue(openedRequest as any);
      mockRepositories.requestToGroupRepository.save.mockResolvedValue({
        ...openedRequest,
        requestStatus: RequestStatus.Canceled,
        finishedAt: new Date(),
      });

      await service.cancelJoinRequestToGroup(1, 1);

      expect(mockRepositories.requestToGroupRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user is not sender', async () => {
      const otherUserRequest = { ...mockRequestToGroup, sender: { id: 2 } };
      jest.spyOn(service, 'getRequestToGroupById').mockResolvedValue(otherUserRequest as any);

      await expect(service.cancelJoinRequestToGroup(1, 1)).rejects.toThrow();
    });
  });

  describe('getGroupById', () => {
    it('should return group by id', async () => {
      mockRepositories.groupRepository.findOne.mockResolvedValue(mockGroup);

      const result = await service.getGroupById(1);

      expect(result).toEqual(mockGroup);
    });

    it('should throw NotFoundException if group not found', async () => {
      mockRepositories.groupRepository.findOne.mockResolvedValue(null);

      await expect(service.getGroupById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserGroups', () => {
    it('should return all user groups', async () => {
      mockRepositories.groupMemberRepository.find.mockResolvedValue([
        { group: mockGroup },
      ]);

      const result = await service.getUserGroups(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockGroup);
    });
  });

  describe('getGroupMemberByGroupAndUser', () => {
    it('should return group member', async () => {
      mockRepositories.groupRepository.findOne.mockResolvedValue(mockGroup);
      mockRepositories.groupMemberRepository.manager.findOne.mockResolvedValue(mockUser);
      mockRepositories.groupMemberRepository.findOne.mockResolvedValue(mockGroupMember);

      const result = await service.getGroupMemberByGroupAndUser(1, 1);

      expect(result).toEqual(mockGroupMember);
    });

    it('should throw NotFoundException if member not found', async () => {
      mockRepositories.groupRepository.findOne.mockResolvedValue(mockGroup);
      mockRepositories.groupMemberRepository.manager.findOne.mockResolvedValue(mockUser);
      mockRepositories.groupMemberRepository.findOne.mockResolvedValue(null);

      await expect(service.getGroupMemberByGroupAndUser(1, 1))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
