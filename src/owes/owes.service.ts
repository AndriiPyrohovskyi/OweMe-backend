import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FullOwe } from './entities/full-owe.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageOweMention } from './entities/message-owe-mention.entity';
import { OweItem } from './entities/owe-item.entity';
import { OweParticipant } from './entities/owe-partipicipant.entity';
import { OweReturn } from './entities/owe-return.entity';
import { CreateOweDto } from './dto/create-owe.dto';
import { UpdateOweDto, UpdateOweItemDto, UpdateOweParticipantDto } from './dto/update-owe.dto';
import { AddParticipantDto } from './dto/add-partipicipant.dto';
import { ReturnOweDto } from './dto/return-owe.dto';
import { User } from 'src/users/entities/user.entity';
import { Group } from 'src/groups/entities/group.entity';
import { OweStatus, ReturnStatus } from 'src/common/enums';

@Injectable()
export class OwesService {
    constructor (
      @InjectRepository(FullOwe)
      private readonly fullOweRepository: Repository<FullOwe>,
  
      @InjectRepository(MessageOweMention)
      private readonly messageOweMentionRepository: Repository<MessageOweMention>,

      @InjectRepository(OweItem)
      private readonly oweItemRepository: Repository<OweItem>,

      @InjectRepository(OweParticipant)
      private readonly oweParticipantRepository: Repository<OweParticipant>,

      @InjectRepository(OweReturn)
      private readonly oweReturnRepository: Repository<OweReturn>,
    ){}
  owesHealthcheck(): object {
    return {message: "Owes Controller is running!"};
  }
  // ---------------------------------- Create Methods -------------------------------------
  
  async createFullOwe(createOweDto: CreateOweDto): Promise<FullOwe> {
    const { name, description, image, fromUserId, oweItems } = createOweDto;

    const fromUser = await this.validateUserExists(fromUserId);

    const fullOwe = this.fullOweRepository.create({
      name,
      description,
      image,
      fromUser,
    });

    // Save fullOwe first to get ID
    const savedFullOwe = await this.fullOweRepository.save(fullOwe);

    const createdOweItems: OweItem[] = [];
    for (const itemDto of oweItems) {
      const oweItem = this.oweItemRepository.create({
        name: itemDto.name,
        description: itemDto.description,
        imageUrl: itemDto.imageUrl,
        fullOwe: savedFullOwe,
      });

      // Save oweItem first to get ID
      const savedOweItem = await this.oweItemRepository.save(oweItem);

      const participants: OweParticipant[] = [];
      for (const participantDto of itemDto.participants) {
        const participant = await this.createOweParticipant(
          savedOweItem,
          participantDto.sum,
          participantDto.toUserId,
          participantDto.groupId,
        );
        // Save participant
        const savedParticipant = await this.oweParticipantRepository.save(participant);
        participants.push(savedParticipant);
      }

      savedOweItem.oweParticipants = participants;
      createdOweItems.push(savedOweItem);
    }

    savedFullOwe.oweItems = createdOweItems;
    return savedFullOwe;
  }

  async createOweItem(fullOweId: number, itemDto: any): Promise<OweItem> {
    const fullOwe = await this.getFullOwe(fullOweId);

    const oweItem = this.oweItemRepository.create({
      name: itemDto.name,
      description: itemDto.description,
      imageUrl: itemDto.imageUrl,
      fullOwe,
    });

    return await this.oweItemRepository.save(oweItem);
  }

  async addParticipant(addParticipantDto: AddParticipantDto): Promise<OweParticipant> {
    const { oweItemId, sum, toUserId, groupId } = addParticipantDto;

    const oweItem = await this.getOweItem(oweItemId);

    return await this.createOweParticipant(oweItem, sum, toUserId, groupId);
  }

  async createOweReturn(returnOweDto: ReturnOweDto): Promise<OweReturn> {
    const { participantId, returned } = returnOweDto;

    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweReturns']
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Перевіряємо, чи статус учасника Accepted
    if (participant.status !== OweStatus.Accepted) {
      throw new BadRequestException('Can only create returns for accepted debts');
    }

    const totalReturned = participant.oweReturns
      ? participant.oweReturns
          .filter(ret => ret.status === ReturnStatus.Accepted)
          .reduce((sum, ret) => sum + Number(ret.returned), 0)
      : 0;

    if (totalReturned + returned > participant.sum) {
      throw new BadRequestException('Return amount exceeds the owed amount');
    }

    const oweReturn = this.oweReturnRepository.create({
      returned,
      participant,
      status: ReturnStatus.Opened,
    });

    return await this.oweReturnRepository.save(oweReturn);
  }

  private async createOweParticipant(
    oweItem: OweItem,
    sum: number,
    toUserId?: number,
    groupId?: number,
  ): Promise<OweParticipant> {
    if (!toUserId && !groupId) {
      throw new BadRequestException('Either toUserId or groupId must be provided');
    }

    const participant = this.oweParticipantRepository.create({
      sum,
      oweItem,
      status: OweStatus.Opened,
    });

    if (toUserId) {
      participant.toUser = await this.validateUserExists(toUserId);
    }

    if (groupId) {
      participant.group = await this.validateGroupExists(groupId);
    }

    return participant;
  }
  private async validateUserExists(userId: number): Promise<User> {
    const user = { id: userId } as User;
    return user;
  }
  private async validateGroupExists(groupId: number): Promise<Group> {
    const group = { id: groupId } as Group;
    return group;
  }

  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  async updateFullOwe(id: number, updateOweDto: UpdateOweDto): Promise<FullOwe> {
    const fullOwe = await this.getFullOwe(id);

    Object.assign(fullOwe, updateOweDto);

    return await this.fullOweRepository.save(fullOwe);
  }
  async updateOweItem(id: number, updateOweItemDto: UpdateOweItemDto): Promise<OweItem> {
    const oweItem = await this.getOweItem(id);

    Object.assign(oweItem, updateOweItemDto);

    return await this.oweItemRepository.save(oweItem);
  }
  async updateOweParticipant(id: number, updateDto: UpdateOweParticipantDto): Promise<OweParticipant> {
    const participant = await this.getOweParticipant(id);

    Object.assign(participant, updateDto);

    return await this.oweParticipantRepository.save(participant);
  }
  // ---------------------------------- Update Methods -------------------------------------
  // ---------------------------------- Status Management Methods --------------------------
  
  // OweParticipant status management
  async cancelOweParticipant(participantId: number, userId: number): Promise<OweParticipant> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with id ${participantId} not found`);
    }

    if (participant.oweItem.fullOwe.fromUser.id !== userId) {
      throw new BadRequestException('Only the debt owner can cancel the participant');
    }

    if (participant.status !== OweStatus.Opened) {
      throw new BadRequestException('Only opened participants can be cancelled');
    }

    participant.status = OweStatus.Canceled;
    return await this.oweParticipantRepository.save(participant);
  }

  async acceptOweParticipant(participantId: number, userId: number): Promise<OweParticipant> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with id ${participantId} not found`);
    }

    if (participant.status !== OweStatus.Opened) {
      throw new BadRequestException('Only opened participants can be accepted');
    }

    if (participant.toUser && participant.toUser.id !== userId) {
      throw new BadRequestException('Only the participant can accept the debt');
    }

    participant.status = OweStatus.Accepted;
    return await this.oweParticipantRepository.save(participant);
  }

  async declineOweParticipant(participantId: number, userId: number): Promise<OweParticipant> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with id ${participantId} not found`);
    }

    if (participant.status !== OweStatus.Opened) {
      throw new BadRequestException('Only opened participants can be declined');
    }

    if (participant.toUser && participant.toUser.id !== userId) {
      throw new BadRequestException('Only the participant can decline the debt');
    }

    participant.status = OweStatus.Declined;
    return await this.oweParticipantRepository.save(participant);
  }

  // OweReturn status management
  async cancelOweReturn(oweReturnId: number, userId: number): Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: oweReturnId },
      relations: ['participant', 'participant.toUser'],
    });

    if (!oweReturn) {
      throw new NotFoundException(`OweReturn with id ${oweReturnId} not found`);
    }

    if (oweReturn.participant.toUser?.id !== userId) {
      throw new BadRequestException('Only the debtor can cancel the return');
    }

    if (oweReturn.status !== ReturnStatus.Opened) {
      throw new BadRequestException('Only opened returns can be cancelled');
    }

    oweReturn.status = ReturnStatus.Canceled;
    return await this.oweReturnRepository.save(oweReturn);
  }

  async acceptOweReturn(oweReturnId: number, userId: number): Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: oweReturnId },
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser', 'participant.oweReturns'],
    });

    if (!oweReturn) {
      throw new NotFoundException(`OweReturn with id ${oweReturnId} not found`);
    }

    if (oweReturn.participant.oweItem.fullOwe.fromUser.id !== userId) {
      throw new BadRequestException('Only the debt owner can accept the return');
    }

    if (oweReturn.status !== ReturnStatus.Opened) {
      throw new BadRequestException('Only opened returns can be accepted');
    }

    oweReturn.status = ReturnStatus.Accepted;
    await this.oweReturnRepository.save(oweReturn);

    // Оновлюємо статус учасника на основі загальної суми повернень
    const totalReturned = oweReturn.participant.oweReturns
      .filter(ret => ret.status === ReturnStatus.Accepted)
      .reduce((sum, ret) => sum + Number(ret.returned), 0);

    if (totalReturned >= Number(oweReturn.participant.sum)) {
      oweReturn.participant.status = OweStatus.Returned;
    } else if (totalReturned > 0) {
      oweReturn.participant.status = OweStatus.PartlyReturned;
    }

    await this.oweParticipantRepository.save(oweReturn.participant);

    return oweReturn;
  }

  async declineOweReturn(oweReturnId: number, userId: number): Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: oweReturnId },
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser'],
    });

    if (!oweReturn) {
      throw new NotFoundException(`OweReturn with id ${oweReturnId} not found`);
    }

    if (oweReturn.participant.oweItem.fullOwe.fromUser.id !== userId) {
      throw new BadRequestException('Only the debt owner can decline the return');
    }

    if (oweReturn.status !== ReturnStatus.Opened) {
      throw new BadRequestException('Only opened returns can be declined');
    }

    oweReturn.status = ReturnStatus.Declined;
    return await this.oweReturnRepository.save(oweReturn);
  }

  // ---------------------------------- Status Management Methods --------------------------
  // ---------------------------------- Delete Methods -------------------------------------
  async deleteFullOwe(id: number): Promise<void> {
    const fullOwe = await this.getFullOwe(id);
    await this.fullOweRepository.remove(fullOwe);
  }
  async deleteOweItem(id: number): Promise<void> {
    const oweItem = await this.getOweItem(id);
    await this.oweItemRepository.remove(oweItem);
  }
  async deleteOweParticipant(id: number): Promise<void> {
    const participant = await this.getOweParticipant(id);
    await this.oweParticipantRepository.remove(participant);
  }
  async deleteOweReturn(id: number): Promise<void> {
    const oweReturn = await this.getOweReturn(id);
    await this.oweReturnRepository.remove(oweReturn);
  }

  // ---------------------------------- Delete Methods -------------------------------------
  // ---------------------------------- Get Methods ----------------------------------------
  async getAllFullOwes() : Promise<FullOwe[]> {
    return await this.fullOweRepository.find({
      relations: ['fromUser', 'oweItems', 'oweItems.oweParticipants', 'oweItems.oweParticipants.toUser', 'oweItems.oweParticipants.group', 'oweItems.oweParticipants.oweReturns']
    });
  }
  async getFullOwe(id: number) : Promise<FullOwe> {
    const fullOwe = await this.fullOweRepository.findOne({
      where: {id: id},
      relations: ['fromUser', 'oweItems', 'oweItems.oweParticipants', 'oweItems.oweParticipants.toUser', 'oweItems.oweParticipants.group', 'oweItems.oweParticipants.oweReturns']
    })
    if (!fullOwe) {
      throw new NotFoundException("Full owe not found!");
    }
    return fullOwe;
  }
  async getFullOweByOweItem(id: number) : Promise<FullOwe> {
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');
    
    const fullOwe = await queryBuilder.leftJoinAndSelect('fullOwe.oweItems', 'oweItem')
      .where('oweItem.id = :id', { id })
      .getOne();

    if (!fullOwe) {
      throw new NotFoundException();
    }
    return fullOwe;
  }
  async getFullOweByOweParticipant(id: number) : Promise<FullOwe> {
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');
    
    const fullOwe = await queryBuilder.leftJoinAndSelect('fullOwe.oweItems', 'oweItem')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .where('oweParticipant.id = :id', { id })
      .getOne();
    if (!fullOwe) {
      throw new NotFoundException();
    }
    return fullOwe;
  }
  async getFullOweByOweReturn(id: number) : Promise<FullOwe> {
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');
    
    const fullOwe = await queryBuilder.leftJoinAndSelect('fullOwe.oweItems', 'oweItem')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturn')
      .where('oweReturn.id = :id', { id })
      .getOne();
    if (!fullOwe) {
      throw new NotFoundException();
    }
    return fullOwe;
  }
  async getAllSendedFullOwesByUser(id: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');
    return await queryBuilder
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('fullOwe.oweItems', 'oweItems')
      .leftJoinAndSelect('oweItems.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .where('fromUser.id = :id', { id })
      .getMany();
  }
  async getAllReceivedFullOwesByUser(id: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('fullOwe.oweItems', 'oweItems')
      .leftJoinAndSelect('oweItems.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .where('oweParticipants.toUser.id = :id', { id })
      .andWhere('fromUser.id != :id', { id })
      .getMany();
  }
  async getAllFullOwesByUser(id: number) : Promise<object>{
    return {
      "sended": await this.getAllSendedFullOwesByUser(id),
      "received": await this.getAllReceivedFullOwesByUser(id)
    }
  }
  async getAllFullOwesByGroup(id: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('fullOwe.oweItems', 'oweItems')
      .leftJoinAndSelect('oweItems.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .where('group.id = :id', { id })
      .getMany();
  }
  async getAllFullOwesByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": await this.getAllSendedFullOwesByGroupMember(userId, groupId),
      "received": await this.getAllReceivedFullOwesByGroupMember(userId, groupId)
    }
  }
  async getAllSendedFullOwesByGroupMember(userId: number, groupId: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('fullOwe.oweItems', 'oweItems')
      .leftJoinAndSelect('oweItems.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .leftJoinAndSelect('group.members', 'groupMember')
      .where('groupMember.user.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllReceivedFullOwesByGroupMember(userId: number, groupId: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('fullOwe.oweItems', 'oweItems')
      .leftJoinAndSelect('oweItems.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .leftJoinAndSelect('group.members', 'groupMember')
      .where('groupMember.user.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('oweParticipants.toUser.id = :userId', { userId })
      .andWhere('fromUser.id != :userId', { userId })
      .getMany();
  }


  async getAllOweItems() : Promise<OweItem[]> {
    return await this.oweItemRepository.find({
      relations: ['fullOwe', 'fullOwe.fromUser', 'oweParticipants', 'oweParticipants.toUser', 'oweParticipants.group', 'oweParticipants.oweReturns']
    });
  }
  async getOweItem(id: number) : Promise<OweItem> {
    const oweItem = await this.oweItemRepository.findOne({
      where: {id: id},
      relations: ['fullOwe', 'fullOwe.fromUser', 'oweParticipants', 'oweParticipants.toUser', 'oweParticipants.group', 'oweParticipants.oweReturns']
    })
    if (!oweItem) {
      throw new NotFoundException("Owe item not found!");
    }
    return oweItem;
  }
  async getOweItemByOweParticipant(id: number) : Promise<OweItem> {
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');
    
    const fullOwe = await queryBuilder.leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .where('oweParticipant.id = :id', { id })
      .getOne();
    if (!fullOwe) {
      throw new NotFoundException();
    }
    return fullOwe;
  }
  async getOweItemByOweReturn(id: number) : Promise<OweItem> {
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');
    
    const fullOwe = await queryBuilder.leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturn')
      .where('oweReturn.id = :id', { id })
      .getOne();
    if (!fullOwe) {
      throw new NotFoundException();
    }
    return fullOwe;
  }
  async getAllSendedOweItemsByUser(id: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');
    return await queryBuilder
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .where('fromUser.id = :id', { id })
      .getMany();
  }
  async getAllReceivedOweItemsByUser(id: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .where('toUser.id = :id', { id })
      .andWhere('fromUser.id != :id', { id })
      .getMany();
  }
  async getAllOweItemsByUser(id: number) : Promise<object>{
    return {
      "sended": await this.getAllSendedOweItemsByUser(id),
      "received": await this.getAllReceivedOweItemsByUser(id)
    }
  }
  async getAllOweItemsByGroup(id: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .where('group.id = :id', { id })
      .getMany();
  }
  async getAllOweItemsByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": await this.getAllSendedOweItemsByGroupMember(userId, groupId),
      "received": await this.getAllReceivedOweItemsByGroupMember(userId, groupId)
    }
  }
  async getAllSendedOweItemsByGroupMember(userId: number, groupId: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllReceivedOweItemsByGroupMember(userId: number, groupId: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipants')
      .leftJoinAndSelect('oweParticipants.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipants.group', 'group')
      .leftJoinAndSelect('oweParticipants.oweReturns', 'oweReturns')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('toUser.id = :userId', { userId })
      .andWhere('fromUser.id != :userId', { userId })
      .getMany();
  }



  async getAllOweParticipant() : Promise<OweParticipant[]> {
    return await this.oweParticipantRepository.find({
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser', 'group', 'oweReturns']
    });
  }
  async getOweParticipant(id: number) : Promise<OweParticipant> {
    const oweParticipant = await this.oweParticipantRepository.findOne({
      where: {id: id},
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser', 'group', 'oweReturns']
    })
    if (!oweParticipant) {
      throw new NotFoundException("Owe participant not found!");
    }
    return oweParticipant;
  }
  async getOweParticipantByOweReturn(id: number) : Promise<OweParticipant> {
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');
    
    const fullOwe = await queryBuilder.leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturn')
      .where('oweReturn.id = :id', { id })
      .getOne();
    if (!fullOwe) {
      throw new NotFoundException();
    }
    return fullOwe;
  }
  async getAllInOweParticipantsByUser(id: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');
    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturns')
      .where('toUser.id = :id', { id })
      .getMany();
  }
  async getAllOutOweParticipantsByUser(id: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');

    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturns')
      .where('fromUser.id = :id', { id })
      .andWhere('toUser.id != :id', { id })
      .getMany();
  }
  async getAllOweParticipantsByUser(id: number) : Promise<object>{
    return {
      "out": await this.getAllOutOweParticipantsByUser(id),
      "in": await this.getAllInOweParticipantsByUser(id)
    }
  }
  async getAllOweParticipantsByGroup(id: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');

    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturns')
      .where('group.id = :id', { id })
      .getMany();
  }
  async getAllOweParticipantsByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": await this.getAllSendedOweItemsByGroupMember(userId, groupId),
      "received": await this.getAllReceivedOweItemsByGroupMember(userId, groupId)
    }
  }
  async getAllOutOweParticipantsByGroupMember(userId: number, groupId: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');

    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturns')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllInOweParticipantsByGroupMember(userId: number, groupId: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');

    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('oweParticipant.oweReturns', 'oweReturns')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('toUser.id = :userId', { userId })
      .andWhere('fromUser.id != :userId', { userId })
      .getMany();
  }



  async getAllOweReturns() : Promise<OweReturn[]> {
    return await this.oweReturnRepository.find({
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser', 'participant.toUser', 'participant.group']
    });
  }
  async getOweReturn(id: number) : Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: {id: id},
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser', 'participant.toUser', 'participant.group']
    })
    if (!oweReturn) {
      throw new NotFoundException("Owe return not found!");
    }
    return oweReturn;
  }
  async getAllInOweReturnsByUser(id: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');
    return await queryBuilder
      .leftJoinAndSelect('oweReturn.participant', 'participant')
      .leftJoinAndSelect('participant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('participant.toUser', 'toUser')
      .leftJoinAndSelect('participant.group', 'group')
      .where('toUser.id = :id', { id })
      .getMany();
  }
  async getAllOutOweReturnsByUser(id: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.participant', 'participant')
      .leftJoinAndSelect('participant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('participant.toUser', 'toUser')
      .leftJoinAndSelect('participant.group', 'group')
      .where('fromUser.id = :id', { id })
      .andWhere('toUser.id != :id', { id })
      .getMany();
  }
  async getAllOweReturnsByUser(id: number) : Promise<object>{
    return {
      "out": await this.getAllOutOweReturnsByUser(id),
      "in": await this.getAllInOweReturnsByUser(id)
    }
  }
  async getAllOweReturnsByGroup(id: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.participant', 'participant')
      .leftJoinAndSelect('participant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('participant.toUser', 'toUser')
      .leftJoinAndSelect('participant.group', 'group')
      .where('group.id = :id', { id })
      .getMany();
  }
  async getAllOweReturnsByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": await this.getAllOutOweReturnsByGroupMember(userId, groupId),
      "received": await this.getAllInOweReturnsByGroupMember(userId, groupId)
    }
  }
  async getAllOutOweReturnsByGroupMember(userId: number, groupId: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.participant', 'participant')
      .leftJoinAndSelect('participant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('participant.toUser', 'toUser')
      .leftJoinAndSelect('participant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllInOweReturnsByGroupMember(userId: number, groupId: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.participant', 'participant')
      .leftJoinAndSelect('participant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('participant.toUser', 'toUser')
      .leftJoinAndSelect('participant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('toUser.id = :userId', { userId })
      .andWhere('fromUser.id != :userId', { userId })
      .getMany();
  }
  // ---------------------------------- Get Methods ----------------------------------------
}
