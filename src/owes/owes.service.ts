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
import { OweStatus } from 'src/common/enums';

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
      status: OweStatus.Opened,
    });

    const createdOweItems: OweItem[] = [];
    for (const itemDto of oweItems) {
      const oweItem = this.oweItemRepository.create({
        sum: itemDto.sum,
        name: itemDto.name,
        description: itemDto.description,
        imageUrl: itemDto.imageUrl,
        fullOwe,
        status: OweStatus.Opened,
      });

      const participants: OweParticipant[] = [];
      for (const participantDto of itemDto.participants) {
        const participant = await this.createOweParticipant(
          oweItem,
          participantDto.sum,
          participantDto.toUserId,
          participantDto.groupId,
        );
        participants.push(participant);
      }

      oweItem.oweParticipants = participants;
      createdOweItems.push(oweItem);
    }

    fullOwe.oweItems = createdOweItems;
    return await this.fullOweRepository.save(fullOwe);
  }

  async createOweItem(fullOweId: number, itemDto: any): Promise<OweItem> {
    const fullOwe = await this.getFullOwe(fullOweId);

    const oweItem = this.oweItemRepository.create({
      sum: itemDto.sum,
      name: itemDto.name,
      description: itemDto.description,
      imageUrl: itemDto.imageUrl,
      fullOwe,
      status: OweStatus.Opened,
    });

    return await this.oweItemRepository.save(oweItem);
  }

  /**
   * Додає учасника до OweItem
   */
  async addParticipant(addParticipantDto: AddParticipantDto): Promise<OweParticipant> {
    const { oweItemId, sum, toUserId, groupId } = addParticipantDto;

    const oweItem = await this.getOweItem(oweItemId);

    return await this.createOweParticipant(oweItem, sum, toUserId, groupId);
  }

  /**
   * Створює повернення боргу
   */
  async createOweReturn(returnOweDto: ReturnOweDto): Promise<OweReturn> {
    const { participantId, returned } = returnOweDto;

    const participant = await this.getOweParticipant(participantId);

    // Перевіряємо, чи сума повернення не перевищує суму боргу
    const totalReturned = participant.oweReturns
      ? participant.oweReturns.reduce((sum, ret) => sum + ret.returned, 0)
      : 0;

    if (totalReturned + returned > participant.sum) {
      throw new BadRequestException('Return amount exceeds the owed amount');
    }

    const oweReturn = this.oweReturnRepository.create({
      returned,
      participant,
      status: OweStatus.Opened,
    });

    const savedReturn = await this.oweReturnRepository.save(oweReturn);

    // Перевіряємо, чи борг повністю повернуто
    if (totalReturned + returned === participant.sum) {
      participant.oweItem.status = OweStatus.Returned;
      await this.oweItemRepository.save(participant.oweItem);
    } else if (totalReturned + returned > 0) {
      participant.oweItem.status = OweStatus.PartlyReturned;
      await this.oweItemRepository.save(participant.oweItem);
    }

    return savedReturn;
  }

  /**
   * Допоміжний метод для створення учасника
   */
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
    });

    if (toUserId) {
      participant.toUser = await this.validateUserExists(toUserId);
    }

    if (groupId) {
      participant.group = await this.validateGroupExists(groupId);
    }

    return participant;
  }

  /**
   * Допоміжний метод для перевірки існування користувача
   */
  private async validateUserExists(userId: number): Promise<User> {
    const user = { id: userId } as User;
    // Тут можна додати реальну перевірку через UsersService, якщо потрібно
    return user;
  }

  /**
   * Допоміжний метод для перевірки існування групи
   */
  private async validateGroupExists(groupId: number): Promise<Group> {
    const group = { id: groupId } as Group;
    // Тут можна додати реальну перевірку через GroupsService, якщо потрібно
    return group;
  }

  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  
  /**
   * Оновлює FullOwe
   */
  async updateFullOwe(id: number, updateOweDto: UpdateOweDto): Promise<FullOwe> {
    const fullOwe = await this.getFullOwe(id);

    Object.assign(fullOwe, updateOweDto);

    return await this.fullOweRepository.save(fullOwe);
  }

  /**
   * Оновлює OweItem
   */
  async updateOweItem(id: number, updateOweItemDto: UpdateOweItemDto): Promise<OweItem> {
    const oweItem = await this.getOweItem(id);

    Object.assign(oweItem, updateOweItemDto);

    return await this.oweItemRepository.save(oweItem);
  }

  /**
   * Оновлює OweParticipant
   */
  async updateOweParticipant(id: number, updateDto: UpdateOweParticipantDto): Promise<OweParticipant> {
    const participant = await this.getOweParticipant(id);

    Object.assign(participant, updateDto);

    return await this.oweParticipantRepository.save(participant);
  }

  // ---------------------------------- Update Methods -------------------------------------
  // ---------------------------------- Delete Methods -------------------------------------
  
  /**
   * Видаляє FullOwe (каскадно видалить всі пов'язані OweItems та OweParticipants)
   */
  async deleteFullOwe(id: number): Promise<void> {
    const fullOwe = await this.getFullOwe(id);
    await this.fullOweRepository.remove(fullOwe);
  }

  /**
   * Видаляє OweItem (каскадно видалить всіх пов'язаних OweParticipants)
   */
  async deleteOweItem(id: number): Promise<void> {
    const oweItem = await this.getOweItem(id);
    await this.oweItemRepository.remove(oweItem);
  }

  /**
   * Видаляє OweParticipant (каскадно видалить всі пов'язані OweReturns)
   */
  async deleteOweParticipant(id: number): Promise<void> {
    const participant = await this.getOweParticipant(id);
    await this.oweParticipantRepository.remove(participant);
  }

  /**
   * Видаляє OweReturn
   */
  async deleteOweReturn(id: number): Promise<void> {
    const oweReturn = await this.getOweReturn(id);
    await this.oweReturnRepository.remove(oweReturn);
  }

  // ---------------------------------- Delete Methods -------------------------------------
  // ---------------------------------- Get Methods ----------------------------------------
  async getAllFullOwes() : Promise<FullOwe[]> {
    return await this.fullOweRepository.find();
  }
  async getFullOwe(id: number) : Promise<FullOwe> {
    const fullOwe = await this.fullOweRepository.findOne({where: {id: id}})
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
    return await queryBuilder.select().where('fullOwe.fromUser.id = :id', { id }).getMany();
  }
  async getAllReceivedFullOwesByUser(id: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder.leftJoinAndSelect('fullOwe.oweItems', 'oweItem')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .where('oweParticipant.toUser.id = :id', { id })
      .andWhere('fullOwe.fromUser.id != :id', { id })
      .getMany();
  }
  async getAllFullOwesByUser(id: number) : Promise<object>{
    return {
      "sended": this.getAllSendedFullOwesByUser(id),
      "received": this.getAllReceivedFullOwesByUser(id)
    }
  }
  async getAllFullOwesByGroup(id: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder.leftJoinAndSelect('fullOwe.oweItems', 'oweItem')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .where('oweParticipant.group.id = :id', { id })
      .getMany();
  }
  async getAllFullOwesByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": this.getAllSendedFullOwesByGroupMember(userId, groupId),
      "received": this.getAllReceivedFullOwesByGroupMember(userId, groupId)
    }
  }
  async getAllSendedFullOwesByGroupMember(userId: number, groupId: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder.leftJoinAndSelect('fullOwe.oweItems', 'oweItem')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .where('groupMember.user.id = :userId', { userId })
      .andWhere('groupMember.group.id = :groupId', { groupId })
      .andWhere('fullOwe.fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllReceivedFullOwesByGroupMember(userId: number, groupId: number) : Promise<FullOwe[]>{
    const queryBuilder = this.fullOweRepository.createQueryBuilder('fullOwe');

    return await queryBuilder.leftJoinAndSelect('fullOwe.oweItems', 'oweItem')
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.group.members', 'groupMember')
      .where('groupMember.user.id = :userId', { userId })
      .andWhere('groupMember.group.id = :groupId', { groupId })
      .andWhere('oweParticipant.toUser.id = :userId', { userId })
      .andWhere('fullOwe.fromUser.id != :id', { userId })
      .getMany();
  }


  async getAllOweItems() : Promise<OweItem[]> {
    return await this.oweItemRepository.find();
  }
  async getOweItem(id: number) : Promise<OweItem> {
    const oweItem = await this.oweItemRepository.findOne({where: {id: id}})
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
      .where('fromUser.id = :id', { id })
      .getMany();
  }
  async getAllReceivedOweItemsByUser(id: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .where('toUser.id = :id', { id })
      .andWhere('fromUser.id != :id', { id })
      .getMany();
  }
  async getAllOweItemsByUser(id: number) : Promise<object>{
    return {
      "sended": this.getAllSendedOweItemsByUser(id),
      "received": this.getAllReceivedOweItemsByUser(id)
    }
  }
  async getAllOweItemsByGroup(id: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder.leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .where('oweParticipant.group.id = :id', { id })
      .getMany();
  }
  async getAllOweItemsByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": this.getAllSendedOweItemsByGroupMember(userId, groupId),
      "received": this.getAllReceivedOweItemsByGroupMember(userId, groupId)
    }
  }
  async getAllSendedOweItemsByGroupMember(userId: number, groupId: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllReceivedOweItemsByGroupMember(userId: number, groupId: number) : Promise<OweItem[]>{
    const queryBuilder = this.oweItemRepository.createQueryBuilder('oweItem');

    return await queryBuilder
      .leftJoinAndSelect('oweItem.oweParticipants', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('toUser.id = :userId', { userId })
      .andWhere('fromUser.id != :userId', { userId })
      .getMany();
  }



  async getAllOweParticipant() : Promise<OweParticipant[]> {
    return await this.oweParticipantRepository.find();
  }
  async getOweParticipant(id: number) : Promise<OweParticipant> {
    const oweParticipant = await this.oweParticipantRepository.findOne({where: {id: id}})
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
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
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
      .where('fromUser.id = :id', { id })
      .andWhere('toUser.id != :id', { id })
      .getMany();
  }
  async getAllOweParticipantsByUser(id: number) : Promise<object>{
    return {
      "out": this.getAllOutOweParticipantsByUser(id),
      "in": this.getAllInOweParticipantsByUser(id)
    }
  }
  async getAllOweParticipantsByGroup(id: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');

    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .where('group.id = :id', { id })
      .getMany();
  }
  async getAllOweParticipantsByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": this.getAllSendedOweItemsByGroupMember(userId, groupId),
      "received": this.getAllReceivedOweItemsByGroupMember(userId, groupId)
    }
  }
  async getAllOutOweParticipantsByGroupMember(userId: number, groupId: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');

    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllInOweParticipantsByGroupMember(userId: number, groupId: number) : Promise<OweParticipant[]>{
    const queryBuilder = this.oweParticipantRepository.createQueryBuilder('oweParticipant');

    return await queryBuilder
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('toUser.id = :userId', { userId })
      .andWhere('fromUser.id != :userId', { userId })
      .getMany();
  }



  async getAllOweReturns() : Promise<OweReturn[]> {
    return await this.oweReturnRepository.find();
  }
  async getOweReturn(id: number) : Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({where: {id: id}})
    if (!oweReturn) {
      throw new NotFoundException("Owe return not found!");
    }
    return oweReturn;
  }
  async getAllInOweReturnsByUser(id: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');
    return await queryBuilder
      .leftJoinAndSelect('oweReturn.oweParticipant', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .where('toUser.id = :id', { id })
      .getMany();
  }
  async getAllOutOweReturnsByUser(id: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.oweParticipant', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .where('fromUser.id = :id', { id })
      .andWhere('toUser.id != :id', { id })
      .getMany();
  }
  async getAllOweReturnsByUser(id: number) : Promise<object>{
    return {
      "out": this.getAllOutOweParticipantsByUser(id),
      "in": this.getAllInOweParticipantsByUser(id)
    }
  }
  async getAllOweReturnsByGroup(id: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.oweParticipant', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .where('group.id = :id', { id })
      .getMany();
  }
  async getAllOweReturnsByGroupMember(userId: number, groupId: number) : Promise<object>{
    return {
      "sended": this.getAllSendedOweItemsByGroupMember(userId, groupId),
      "received": this.getAllReceivedOweItemsByGroupMember(userId, groupId)
    }
  }
  async getAllOutOweReturnsByGroupMember(userId: number, groupId: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.oweParticipant', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('fromUser.id = :userId', { userId })
      .getMany();
  }
  async getAllInOweReturnsByGroupMember(userId: number, groupId: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');

    return await queryBuilder
      .leftJoinAndSelect('oweReturn.oweParticipant', 'oweParticipant')
      .leftJoinAndSelect('oweParticipant.group', 'group')
      .leftJoinAndSelect('group.members', 'groupMember')
      .leftJoinAndSelect('groupMember.user', 'memberUser')
      .leftJoinAndSelect('oweParticipant.toUser', 'toUser')
      .leftJoinAndSelect('oweParticipant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .where('memberUser.id = :userId', { userId })
      .andWhere('group.id = :groupId', { groupId })
      .andWhere('toUser.id = :userId', { userId })
      .andWhere('fromUser.id != :userId', { userId })
      .getMany();
  }
  // ---------------------------------- Get Methods ----------------------------------------
}
