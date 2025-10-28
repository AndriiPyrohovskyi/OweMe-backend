import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FriendshipRequest } from './entities/friendship-request.entity';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RequestStatus } from '../common/enums';

describe('FriendsService', () => {
  let service: FriendsService;
  let friendshipRequestRepository: Repository<FriendshipRequest>;

  const mockUser1 = {
    id: 1,
    username: 'user1',
    email: 'user1@example.com',
  };

  const mockUser2 = {
    id: 2,
    username: 'user2',
    email: 'user2@example.com',
  };

  const mockFriendRequest = {
    id: 1,
    sender: mockUser1,
    receiver: mockUser2,
    requestStatus: RequestStatus.Opened,
    createdAt: new Date(),
    finishedAt: null,
    acceptedAt: null,
  };

  const mockFriendshipRequestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    manager: {
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: getRepositoryToken(FriendshipRequest),
          useValue: mockFriendshipRequestRepository,
        },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    friendshipRequestRepository = module.get<Repository<FriendshipRequest>>(
      getRepositoryToken(FriendshipRequest),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('friendsHealthcheck', () => {
    it('should return health check message', () => {
      const result = service.friendsHealthcheck();
      expect(result).toEqual({ message: 'Friends Controller is running!' });
    });
  });

  describe('sendFriendRequest', () => {
    it('should create and send friend request', async () => {
      mockFriendshipRequestRepository.manager.findOne
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      mockFriendshipRequestRepository.findOne
        .mockResolvedValueOnce(null) // No existing friendship
        .mockResolvedValueOnce(null); // No pending request
      mockFriendshipRequestRepository.create.mockReturnValue(mockFriendRequest);
      mockFriendshipRequestRepository.save.mockResolvedValue(mockFriendRequest);

      const result = await service.sendFriendRequest(1, 2);

      expect(result).toHaveProperty('message');
      expect(mockFriendshipRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw error if sender and receiver are the same', async () => {
      await expect(service.sendFriendRequest(1, 1)).rejects.toThrow();
    });

    it('should throw error if sender not found', async () => {
      mockFriendshipRequestRepository.manager.findOne.mockResolvedValue(null);

      await expect(service.sendFriendRequest(1, 2)).rejects.toThrow();
    });

    it('should throw error if already friends', async () => {
      mockFriendshipRequestRepository.manager.findOne
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      mockFriendshipRequestRepository.findOne.mockResolvedValue({
        ...mockFriendRequest,
        requestStatus: RequestStatus.Accepted,
      });

      await expect(service.sendFriendRequest(1, 2)).rejects.toThrow();
    });

    it('should throw error if pending request exists', async () => {
      mockFriendshipRequestRepository.manager.findOne
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      mockFriendshipRequestRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFriendRequest);

      await expect(service.sendFriendRequest(1, 2)).rejects.toThrow();
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept friend request', async () => {
      const acceptedRequest = {
        ...mockFriendRequest,
        requestStatus: RequestStatus.Accepted,
        finishedAt: expect.any(Date),
        acceptedAt: expect.any(Date),
      };

      mockFriendshipRequestRepository.findOne.mockResolvedValue(mockFriendRequest);
      mockFriendshipRequestRepository.save.mockResolvedValue(acceptedRequest);

      const result = await service.acceptFriendRequest(1, 2);

      expect(result).toBeDefined();
      expect(mockFriendshipRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if request not found', async () => {
      mockFriendshipRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.acceptFriendRequest(999, 2)).rejects.toThrow();
    });

    it('should throw error if user is not receiver', async () => {
      mockFriendshipRequestRepository.findOne.mockResolvedValue(mockFriendRequest);

      await expect(service.acceptFriendRequest(1, 3)).rejects.toThrow();
    });

    it('should throw error if request is not opened', async () => {
      mockFriendshipRequestRepository.findOne.mockResolvedValue({
        ...mockFriendRequest,
        requestStatus: RequestStatus.Accepted,
      });

      await expect(service.acceptFriendRequest(1, 2)).rejects.toThrow();
    });
  });

  describe('declineFriendRequest', () => {
    it('should decline friend request', async () => {
      const openedRequest = { ...mockFriendRequest, requestStatus: RequestStatus.Opened };
      mockFriendshipRequestRepository.findOne.mockResolvedValue(openedRequest);
      mockFriendshipRequestRepository.save.mockResolvedValue({
        ...openedRequest,
        requestStatus: RequestStatus.Declined,
        finishedAt: expect.any(Date),
      });

      const result = await service.declineFriendRequest(1, 2);

      expect(result.requestStatus).toBe(RequestStatus.Declined);
      expect(mockFriendshipRequestRepository.save).toHaveBeenCalled();
    });
  });

  describe('cancelFriendRequest', () => {
    it('should cancel friend request', async () => {
      const openedRequest = { ...mockFriendRequest, requestStatus: RequestStatus.Opened };
      mockFriendshipRequestRepository.findOne.mockResolvedValue(openedRequest);
      mockFriendshipRequestRepository.save.mockResolvedValue({
        ...openedRequest,
        requestStatus: RequestStatus.Canceled,
        finishedAt: expect.any(Date),
      });

      const result = await service.cancelFriendRequest(1, 1);

      expect(result.requestStatus).toBe(RequestStatus.Canceled);
      expect(mockFriendshipRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user is not sender', async () => {
      mockFriendshipRequestRepository.findOne.mockResolvedValue(mockFriendRequest);

      await expect(service.cancelFriendRequest(1, 3)).rejects.toThrow();
    });
  });

  describe('getAllUserFriends', () => {
    it('should return all friends of a user', async () => {
      const friendships = [
        {
          ...mockFriendRequest,
          requestStatus: RequestStatus.Accepted,
          sender: mockUser1,
          receiver: mockUser2,
        },
      ];

      mockFriendshipRequestRepository.find.mockResolvedValue(friendships);

      const result = await service.getAllUserFriends(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAllCommonUsersFriends', () => {
    it('should return common friends between two users', async () => {
      const mockFriend = { id: 3, username: 'common', email: 'common@example.com' };
      
      jest.spyOn(service, 'getAllUserFriends')
        .mockResolvedValueOnce([mockFriend as User])
        .mockResolvedValueOnce([mockFriend as User]);

      const result = await service.getAllCommonUsersFriends(1, 2);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });
  });

  describe('removeFriend', () => {
    it('should remove friendship', async () => {
      const acceptedFriendship = {
        ...mockFriendRequest,
        requestStatus: RequestStatus.Accepted,
      };

      mockFriendshipRequestRepository.findOne.mockResolvedValue(acceptedFriendship);
      mockFriendshipRequestRepository.remove.mockResolvedValue(acceptedFriendship);

      await service.removeFriend(1, 2);

      expect(mockFriendshipRequestRepository.remove).toHaveBeenCalledWith(acceptedFriendship);
    });

    it('should throw error if friendship not found', async () => {
      mockFriendshipRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.removeFriend(1, 2)).rejects.toThrow();
    });
  });

  describe('checkIfUsersAreFriends', () => {
    it('should return true if users are friends', async () => {
      mockFriendshipRequestRepository.findOne.mockResolvedValue({
        ...mockFriendRequest,
        requestStatus: RequestStatus.Accepted,
      });

      const result = await service.checkIfUsersAreFriends(1, 2);

      expect(result).toBe(true);
    });

    it('should return false if users are not friends', async () => {
      mockFriendshipRequestRepository.findOne.mockResolvedValue(null);

      const result = await service.checkIfUsersAreFriends(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('getFriendCount', () => {
    it('should return friend count', async () => {
      mockFriendshipRequestRepository.count.mockResolvedValue(2);

      const result = await service.getFriendCount(1);

      expect(result).toBe(2);
    });
  });

  describe('acceptAllFriendRequestsByUser', () => {
    it('should accept all pending requests for user', async () => {
      mockFriendshipRequestRepository.find.mockResolvedValue([mockFriendRequest]);
      mockFriendshipRequestRepository.save.mockResolvedValue({
        ...mockFriendRequest,
        requestStatus: RequestStatus.Accepted,
      });

      const result = await service.acceptAllFriendRequestsByUser(2);

      expect(result).toHaveLength(1);
      expect(mockFriendshipRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw error if no pending requests', async () => {
      mockFriendshipRequestRepository.find.mockResolvedValue([]);

      await expect(service.acceptAllFriendRequestsByUser(2)).rejects.toThrow();
    });
  });
});
