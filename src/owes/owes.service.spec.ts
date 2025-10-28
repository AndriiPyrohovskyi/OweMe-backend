import { Test, TestingModule } from '@nestjs/testing';
import { OwesService } from './owes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FullOwe } from './entities/full-owe.entity';
import { MessageOweMention } from './entities/message-owe-mention.entity';
import { OweItem } from './entities/owe-item.entity';
import { OweParticipant } from './entities/owe-partipicipant.entity';
import { OweReturn } from './entities/owe-return.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OweStatus } from '../common/enums';

describe('OwesService', () => {
  let service: OwesService;
  let fullOweRepository: Repository<FullOwe>;
  let oweItemRepository: Repository<OweItem>;
  let oweParticipantRepository: Repository<OweParticipant>;
  let oweReturnRepository: Repository<OweReturn>;

  const mockUser = {
    id: 1,
    username: 'testuser',
  };

  const mockGroup = {
    id: 1,
    name: 'Test Group',
  };

  const mockFullOwe = {
    id: 1,
    name: 'Test Owe',
    description: 'Test description',
    image: null,
    fromUser: mockUser,
    status: OweStatus.Opened,
    oweItems: [],
  };

  const mockOweItem = {
    id: 1,
    sum: 100,
    name: 'Test Item',
    description: 'Item description',
    imageUrl: null,
    fullOwe: mockFullOwe,
    status: OweStatus.Opened,
    participants: [],
  };

  const mockOweParticipant = {
    id: 1,
    sum: 50,
    oweItem: mockOweItem,
    toUser: { id: 2 },
    group: null,
    oweReturns: [],
  };

  const mockOweReturn = {
    id: 1,
    returned: 25,
    participant: mockOweParticipant,
    status: OweStatus.Opened,
  };

  const mockRepositories = {
    fullOweRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    },
    messageOweMentionRepository: {
      create: jest.fn(),
      save: jest.fn(),
    },
    oweItemRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    },
    oweParticipantRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    },
    oweReturnRepository: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwesService,
        {
          provide: getRepositoryToken(FullOwe),
          useValue: mockRepositories.fullOweRepository,
        },
        {
          provide: getRepositoryToken(MessageOweMention),
          useValue: mockRepositories.messageOweMentionRepository,
        },
        {
          provide: getRepositoryToken(OweItem),
          useValue: mockRepositories.oweItemRepository,
        },
        {
          provide: getRepositoryToken(OweParticipant),
          useValue: mockRepositories.oweParticipantRepository,
        },
        {
          provide: getRepositoryToken(OweReturn),
          useValue: mockRepositories.oweReturnRepository,
        },
      ],
    }).compile();

    service = module.get<OwesService>(OwesService);
    fullOweRepository = module.get(getRepositoryToken(FullOwe));
    oweItemRepository = module.get(getRepositoryToken(OweItem));
    oweParticipantRepository = module.get(getRepositoryToken(OweParticipant));
    oweReturnRepository = module.get(getRepositoryToken(OweReturn));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('owesHealthcheck', () => {
    it('should return health check message', () => {
      const result = service.owesHealthcheck();
      expect(result).toEqual({ message: 'Owes Controller is running!' });
    });
  });

  describe('createFullOwe', () => {
    it('should create a full owe with items and participants', async () => {
      const createOweDto = {
        name: 'Test Owe',
        description: 'Description',
        image: undefined,
        fromUserId: 1,
        oweItems: [
          {
            sum: 100,
            name: 'Item 1',
            description: 'Item desc',
            imageUrl: undefined,
            participants: [
              { sum: 50, toUserId: 2 },
            ],
          },
        ],
      };

      mockRepositories.fullOweRepository.create.mockReturnValue(mockFullOwe);
      mockRepositories.fullOweRepository.save.mockResolvedValue(mockFullOwe);
      mockRepositories.oweItemRepository.create.mockReturnValue(mockOweItem);
      mockRepositories.oweItemRepository.save.mockResolvedValue(mockOweItem);
      mockRepositories.oweParticipantRepository.create.mockReturnValue(mockOweParticipant);
      mockRepositories.oweParticipantRepository.save.mockResolvedValue(mockOweParticipant);

      const result = await service.createFullOwe(createOweDto);

      expect(result).toBeDefined();
      expect(mockRepositories.fullOweRepository.save).toHaveBeenCalled();
    });
  });

  describe('createOweItem', () => {
    it('should create an owe item', async () => {
      const itemDto = {
        sum: 100,
        name: 'New Item',
        description: 'Description',
        imageUrl: undefined,
        participants: [],
      };

      jest.spyOn(service, 'getFullOwe').mockResolvedValue(mockFullOwe as any);
      mockRepositories.oweItemRepository.create.mockReturnValue(mockOweItem);
      mockRepositories.oweItemRepository.save.mockResolvedValue(mockOweItem);

      const result = await service.createOweItem(1, itemDto);

      expect(result).toEqual(mockOweItem);
      expect(mockRepositories.oweItemRepository.save).toHaveBeenCalled();
    });
  });

  describe('addParticipant', () => {
    it('should add a participant to owe item', async () => {
      const addParticipantDto = {
        oweItemId: 1,
        sum: 50,
        toUserId: 2,
        groupId: undefined,
      };

      jest.spyOn(service, 'getOweItem').mockResolvedValue(mockOweItem as any);
      mockRepositories.oweParticipantRepository.create.mockReturnValue(mockOweParticipant);
      mockRepositories.oweParticipantRepository.save.mockResolvedValue(mockOweParticipant);

      const result = await service.addParticipant(addParticipantDto);

      expect(result).toEqual(mockOweParticipant);
    });
  });

  describe('createOweReturn', () => {
    it('should create an owe return', async () => {
      const returnOweDto = {
        participantId: 1,
        returned: 25,
      };

      const participantWithReturns = {
        ...mockOweParticipant,
        oweReturns: [],
      };

      jest.spyOn(service, 'getOweParticipant').mockResolvedValue(participantWithReturns as any);
      mockRepositories.oweReturnRepository.create.mockReturnValue(mockOweReturn);
      mockRepositories.oweReturnRepository.save.mockResolvedValue(mockOweReturn);
      mockRepositories.oweParticipantRepository.save.mockResolvedValue(participantWithReturns);

      const result = await service.createOweReturn(returnOweDto);

      expect(result).toEqual(mockOweReturn);
      expect(mockRepositories.oweReturnRepository.save).toHaveBeenCalled();
    });

    it('should throw error if return amount exceeds owed amount', async () => {
      const returnOweDto = {
        participantId: 1,
        returned: 100,
      };

      const participantWithReturns = {
        ...mockOweParticipant,
        sum: 50,
        oweReturns: [{ returned: 40 }],
      };

      jest.spyOn(service, 'getOweParticipant').mockResolvedValue(participantWithReturns as any);

      await expect(service.createOweReturn(returnOweDto)).rejects.toThrow();
    });
  });

  describe('updateFullOwe', () => {
    it('should update full owe', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedOwe = { ...mockFullOwe, ...updateDto };

      jest.spyOn(service, 'getFullOwe').mockResolvedValue(mockFullOwe as any);
      mockRepositories.fullOweRepository.save.mockResolvedValue(updatedOwe);

      const result = await service.updateFullOwe(1, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(mockRepositories.fullOweRepository.save).toHaveBeenCalled();
    });
  });

  describe('cancelFullOwe', () => {
    it('should cancel full owe by owner', async () => {
      mockRepositories.fullOweRepository.findOne.mockResolvedValue(mockFullOwe);
      mockRepositories.fullOweRepository.save.mockResolvedValue({
        ...mockFullOwe,
        status: OweStatus.Canceled,
      });

      const result = await service.cancelFullOwe(1, 1);

      expect(result.status).toBe(OweStatus.Canceled);
    });

    it('should throw error if user is not owner', async () => {
      mockRepositories.fullOweRepository.findOne.mockResolvedValue(mockFullOwe);

      await expect(service.cancelFullOwe(1, 2)).rejects.toThrow();
    });

    it('should throw error if owe is not opened', async () => {
      mockRepositories.fullOweRepository.findOne.mockResolvedValue({
        ...mockFullOwe,
        status: OweStatus.Accepted,
      });

      await expect(service.cancelFullOwe(1, 1)).rejects.toThrow();
    });
  });

  describe('acceptFullOwe', () => {
    it('should accept full owe by participant', async () => {
      const openedOwe = {
        ...mockFullOwe,
        status: OweStatus.Opened,
        oweItems: [{
          ...mockOweItem,
          participants: [{ toUser: { id: 2 } }],
        }],
      };

      mockRepositories.fullOweRepository.findOne.mockResolvedValue(openedOwe);
      mockRepositories.fullOweRepository.save.mockResolvedValue({
        ...openedOwe,
        status: OweStatus.Accepted,
      });

      const result = await service.acceptFullOwe(1, 2);

      expect(result.status).toBe(OweStatus.Accepted);
    });

    it('should throw error if user is owner', async () => {
      mockRepositories.fullOweRepository.findOne.mockResolvedValue(mockFullOwe);

      await expect(service.acceptFullOwe(1, 1)).rejects.toThrow();
    });
  });

  describe('declineFullOwe', () => {
    it('should decline full owe by participant', async () => {
      const openedOwe = {
        ...mockFullOwe,
        status: OweStatus.Opened,
        oweItems: [{
          ...mockOweItem,
          participants: [{ toUser: { id: 2 } }],
        }],
      };

      mockRepositories.fullOweRepository.findOne.mockResolvedValue(openedOwe);
      mockRepositories.fullOweRepository.save.mockResolvedValue({
        ...openedOwe,
        status: OweStatus.Declined,
      });

      const result = await service.declineFullOwe(1, 2);

      expect(result.status).toBe(OweStatus.Declined);
    });
  });

  describe('getFullOwe', () => {
    it('should return full owe by id', async () => {
      mockRepositories.fullOweRepository.findOne.mockResolvedValue(mockFullOwe);

      const result = await service.getFullOwe(1);

      expect(result).toEqual(mockFullOwe);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepositories.fullOweRepository.findOne.mockResolvedValue(null);

      await expect(service.getFullOwe(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOweItem', () => {
    it('should return owe item by id', async () => {
      mockRepositories.oweItemRepository.findOne.mockResolvedValue(mockOweItem);

      const result = await service.getOweItem(1);

      expect(result).toEqual(mockOweItem);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepositories.oweItemRepository.findOne.mockResolvedValue(null);

      await expect(service.getOweItem(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllFullOwes', () => {
    it('should return all full owes', async () => {
      mockRepositories.fullOweRepository.find.mockResolvedValue([mockFullOwe]);

      const result = await service.getAllFullOwes();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockFullOwe);
    });
  });

  describe('deleteFullOwe', () => {
    it('should delete full owe', async () => {
      jest.spyOn(service, 'getFullOwe').mockResolvedValue(mockFullOwe as any);
      mockRepositories.fullOweRepository.remove.mockResolvedValue(mockFullOwe);

      await service.deleteFullOwe(1);

      expect(mockRepositories.fullOweRepository.remove).toHaveBeenCalledWith(mockFullOwe);
    });
  });

  describe('deleteOweItem', () => {
    it('should delete owe item', async () => {
      jest.spyOn(service, 'getOweItem').mockResolvedValue(mockOweItem as any);
      mockRepositories.oweItemRepository.remove.mockResolvedValue(mockOweItem);

      await service.deleteOweItem(1);

      expect(mockRepositories.oweItemRepository.remove).toHaveBeenCalledWith(mockOweItem);
    });
  });

  describe('getAllFullOwesByUser', () => {
    it('should return sent and received owes for user', async () => {
      jest.spyOn(service, 'getAllSendedFullOwesByUser').mockResolvedValue([mockFullOwe as any]);
      jest.spyOn(service, 'getAllReceivedFullOwesByUser').mockResolvedValue([]);

      const result = await service.getAllFullOwesByUser(1);


      expect(result).toHaveProperty('sended');
      expect(result).toHaveProperty('received');
    });
  });
});
