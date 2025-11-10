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
import { WalletService } from 'src/wallet/wallet.service';

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

      private readonly walletService: WalletService,
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
        imageUrls: itemDto.imageUrls || [],
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
      imageUrls: itemDto.imageUrls || [],
      fullOwe,
    });

    return await this.oweItemRepository.save(oweItem);
  }

  async addParticipant(addParticipantDto: AddParticipantDto): Promise<OweParticipant> {
    const { oweItemId, sum, toUserId, groupId } = addParticipantDto;

    const oweItem = await this.getOweItem(oweItemId);

    return await this.createOweParticipant(oweItem, sum, toUserId, groupId);
  }

  async createOweReturn(returnOweDto: ReturnOweDto, userId: number): Promise<OweReturn> {
    const { participantId, returned } = returnOweDto;

    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweReturns', 'oweItem', 'oweItem.fullOwe', 'toUser', 'group', 'group.members', 'group.members.user']
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Перевіряємо, чи статус учасника Accepted
    if (participant.status !== OweStatus.Accepted) {
      throw new BadRequestException('Can only create returns for accepted debts');
    }

    // Перевіряємо, чи користувач є боржником
    if (participant.toUser) {
      // Індивідуальний борг - перевіряємо toUser
      if (participant.toUser.id !== userId) {
        throw new BadRequestException('Only the debtor can create a return');
      }
    } else if (participant.group) {
      // Груповий борг - перевіряємо чи користувач є членом групи
      const isMember = participant.group.members.some(member => member.user.id === userId);
      if (!isMember) {
        throw new BadRequestException('Only group members can create returns for group debts');
      }
    } else {
      throw new BadRequestException('Participant must have either toUser or group');
    }

    // Враховуємо як прийняті (Accepted), так і відкриті (Opened) returns
    const totalReturned = participant.oweReturns
      ? participant.oweReturns
          .filter(ret => ret.status === ReturnStatus.Accepted || ret.status === ReturnStatus.Opened)
          .reduce((sum, ret) => sum + Number(ret.returned), 0)
      : 0;

    const remaining = participant.sum - totalReturned;
    
    if (returned > remaining) {
      throw new BadRequestException(
        `Return amount exceeds remaining debt. Owed: ${participant.sum}, Already returned/pending: ${totalReturned}, Remaining: ${remaining}, Requested: ${returned}`
      );
    }

    // Перевіряємо, чи користувач має достатньо коштів
    try {
      const wallet = await this.walletService.getWallet(userId);
      if (wallet.balance < returned) {
        throw new BadRequestException(`Insufficient funds. You have ${wallet.balance} ${wallet.currency}, but need ${returned}`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Wallet not found. Please create a wallet first.');
      }
      throw error;
    }

    const oweReturn = this.oweReturnRepository.create({
      returned,
      participant,
      status: ReturnStatus.Opened,
    });

    const savedReturn = await this.oweReturnRepository.save(oweReturn);

    // Заморожуємо кошти
    try {
      const holdTransaction = await this.walletService.holdFundsForDebtReturn(
        userId,
        returned,
        savedReturn.id,
        `Debt return for "${participant.oweItem.fullOwe.name}"`
      );

      // Зберігаємо ID транзакції
      savedReturn.holdTransactionId = holdTransaction.id;
      await this.oweReturnRepository.save(savedReturn);
    } catch (error) {
      // Якщо не вдалося заморозити кошти, видаляємо повернення
      await this.oweReturnRepository.remove(savedReturn);
      throw new BadRequestException(`Failed to hold funds: ${error.message}`);
    }

    return savedReturn;
  }

  // Прийняти повернення боргу (власник боргу)
  async acceptOweReturn(returnId: number, ownerId: number): Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: returnId },
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser', 'participant.toUser']
    });

    if (!oweReturn) {
      throw new NotFoundException('Return not found');
    }

    if (oweReturn.status !== ReturnStatus.Opened) {
      throw new BadRequestException(`Cannot accept return in status: ${oweReturn.status}`);
    }

    // Перевіряємо, чи користувач є власником боргу
    if (oweReturn.participant.oweItem.fullOwe.fromUser.id !== ownerId) {
      throw new BadRequestException('Only the debt owner can accept the return');
    }

    if (!oweReturn.holdTransactionId) {
      throw new BadRequestException('No hold transaction found for this return');
    }

    // Переводимо кошти власнику боргу
    try {
      await this.walletService.transferFundsForAcceptedDebtReturn(
        oweReturn.holdTransactionId,
        oweReturn.id,
        ownerId
      );

      oweReturn.status = ReturnStatus.Accepted;
      const savedReturn = await this.oweReturnRepository.save(oweReturn);

      // Оновлюємо статус учасника
      await this.updateParticipantStatus(oweReturn.participant.id);

      return savedReturn;
    } catch (error) {
      throw new BadRequestException(`Failed to transfer funds: ${error.message}`);
    }
  }

  // Відхилити повернення боргу (власник боргу)
  async declineOweReturn(returnId: number, ownerId: number): Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: returnId },
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser']
    });

    if (!oweReturn) {
      throw new NotFoundException('Return not found');
    }

    if (oweReturn.status !== ReturnStatus.Opened) {
      throw new BadRequestException(`Cannot decline return in status: ${oweReturn.status}`);
    }

    // Перевіряємо, чи користувач є власником боргу
    if (oweReturn.participant.oweItem.fullOwe.fromUser.id !== ownerId) {
      throw new BadRequestException('Only the debt owner can decline the return');
    }

    if (!oweReturn.holdTransactionId) {
      throw new BadRequestException('No hold transaction found for this return');
    }

    // Розморожуємо кошти
    try {
      await this.walletService.releaseFundsForDebtReturn(
        oweReturn.holdTransactionId,
        oweReturn.id,
        'declined'
      );

      oweReturn.status = ReturnStatus.Declined;
      return await this.oweReturnRepository.save(oweReturn);
    } catch (error) {
      throw new BadRequestException(`Failed to release funds: ${error.message}`);
    }
  }

  // Скасувати повернення боргу (той, хто повертає)
  async cancelOweReturn(returnId: number, userId: number): Promise<OweReturn> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: returnId },
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.toUser']
    });

    if (!oweReturn) {
      throw new NotFoundException('Return not found');
    }

    if (oweReturn.status !== ReturnStatus.Opened) {
      throw new BadRequestException(`Cannot cancel return in status: ${oweReturn.status}`);
    }

    // Перевіряємо, чи користувач є тим, хто повертає борг
    // Для індивідуального боргу перевіряємо toUser
    if (oweReturn.participant.toUser && oweReturn.participant.toUser.id !== userId) {
      throw new BadRequestException('Only the person returning the debt can cancel the return');
    }
    // TODO: Для групових боргів потрібна додаткова перевірка

    if (!oweReturn.holdTransactionId) {
      throw new BadRequestException('No hold transaction found for this return');
    }

    // Розморожуємо кошти
    try {
      await this.walletService.releaseFundsForDebtReturn(
        oweReturn.holdTransactionId,
        oweReturn.id,
        'canceled'
      );

      oweReturn.status = ReturnStatus.Canceled;
      return await this.oweReturnRepository.save(oweReturn);
    } catch (error) {
      throw new BadRequestException(`Failed to release funds: ${error.message}`);
    }
  }

  // Допоміжний метод для оновлення статусу учасника
  // Оновлює статус на основі ТІЛЬКИ прийнятих (Accepted) повернень
  private async updateParticipantStatus(participantId: number): Promise<void> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweReturns']
    });

    if (!participant) return;

    // Рахуємо тільки прийняті (Accepted) повернення
    // Declined та Canceled не впливають на статус
    const totalAcceptedReturns = participant.oweReturns
      .filter(ret => ret.status === ReturnStatus.Accepted)
      .reduce((sum, ret) => sum + Number(ret.returned), 0);

    const participantSum = Number(participant.sum);

    // Оновлюємо статус на основі суми прийнятих повернень
    if (totalAcceptedReturns >= participantSum) {
      participant.status = OweStatus.Returned;
    } else if (totalAcceptedReturns > 0) {
      participant.status = OweStatus.PartlyReturned;
    } else {
      // Якщо немає прийнятих повернень, статус залишається Accepted
      // (не змінюємо на Opened, бо participant вже прийнятий)
    }

    await this.oweParticipantRepository.save(participant);
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

    // Завантажуємо fullOwe щоб перевірити fromUser
    const fullOweWithUser = await this.oweItemRepository.findOne({
      where: { id: oweItem.id },
      relations: ['fullOwe', 'fullOwe.fromUser'],
    });

    if (!fullOweWithUser) {
      throw new NotFoundException('OweItem not found');
    }

    const fromUserId = fullOweWithUser.fullOwe.fromUser.id;

    // Перевіряємо що користувач не створює борг сам собі
    if (toUserId && fromUserId === toUserId) {
      throw new BadRequestException('Cannot create debt to yourself');
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
      const group = await this.validateGroupExists(groupId);
      
      // Перевіряємо чи fromUser не є членом групи (щоб не створити борг собі через групу)
      const groupWithMembers = await this.oweParticipantRepository.manager.findOne(Group, {
        where: { id: groupId },
        relations: ['members', 'members.user'],
      });
      
      if (groupWithMembers) {
        const isMember = groupWithMembers.members.some(member => member.user.id === fromUserId);
        if (isMember) {
          throw new BadRequestException('Cannot create group debt when you are a member of the group');
        }
      }
      
      participant.group = group;
    }

    return participant;
  }
  private async validateUserExists(userId: number): Promise<User> {
    // Fetch full User entity to ensure we populate username and other fields
    const user = await this.oweParticipantRepository.manager.findOne(User, { where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    return user;
  }
  private async validateGroupExists(groupId: number): Promise<Group> {
    const group = await this.oweParticipantRepository.manager.findOne(Group, { where: { id: groupId } });
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }
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
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser', 'group', 'group.members', 'group.members.user'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with id ${participantId} not found`);
    }

    if (participant.status !== OweStatus.Opened) {
      throw new BadRequestException('Only opened participants can be accepted');
    }

    // Перевірка для індивідуального боргу
    if (participant.toUser) {
      if (participant.toUser.id !== userId) {
        throw new BadRequestException('Only the participant can accept the debt');
      }
    } 
    // Перевірка для групового боргу
    else if (participant.group) {
      const isMember = participant.group.members.some(member => member.user.id === userId);
      if (!isMember) {
        throw new BadRequestException('Only group members can accept group debts');
      }
    } else {
      throw new BadRequestException('Participant must have either toUser or group');
    }

    participant.status = OweStatus.Accepted;
    return await this.oweParticipantRepository.save(participant);
  }

  async declineOweParticipant(participantId: number, userId: number): Promise<OweParticipant> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser', 'group', 'group.members', 'group.members.user'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with id ${participantId} not found`);
    }

    if (participant.status !== OweStatus.Opened) {
      throw new BadRequestException('Only opened participants can be declined');
    }

    // Перевірка для індивідуального боргу
    if (participant.toUser) {
      if (participant.toUser.id !== userId) {
        throw new BadRequestException('Only the participant can decline the debt');
      }
    } 
    // Перевірка для групового боргу
    else if (participant.group) {
      const isMember = participant.group.members.some(member => member.user.id === userId);
      if (!isMember) {
        throw new BadRequestException('Only group members can decline group debts');
      }
    } else {
      throw new BadRequestException('Participant must have either toUser or group');
    }

    participant.status = OweStatus.Declined;
    return await this.oweParticipantRepository.save(participant);
  }

  // OweReturn status management - moved to new wallet-integrated methods above

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
  // Returns які МНЕ НАДІСЛАЛИ (я - fromUser, власник боргу)
  // Це returns для погашення МОЇХ боргів, які я можу прийняти/відхилити
  // IN = отримані returns (хтось повертає мені борг)
  async getAllInOweReturnsByUser(id: number) : Promise<OweReturn[]>{
    const queryBuilder = this.oweReturnRepository.createQueryBuilder('oweReturn');
    return await queryBuilder
      .leftJoinAndSelect('oweReturn.participant', 'participant')
      .leftJoinAndSelect('participant.oweItem', 'oweItem')
      .leftJoinAndSelect('oweItem.fullOwe', 'fullOwe')
      .leftJoinAndSelect('fullOwe.fromUser', 'fromUser')
      .leftJoinAndSelect('participant.toUser', 'toUser')
      .leftJoinAndSelect('participant.group', 'group')
      .where('fromUser.id = :id', { id })
      .andWhere('(toUser.id != :id OR toUser.id IS NULL)', { id })
      .getMany();
  }
  
  // Returns які Я СТВОРИВ (я - toUser, боржник)
  // Це returns для погашення ЧУЖИХ боргів, які я можу скасувати
  // OUT = відправлені returns (я повертаю комусь борг)
  async getAllOutOweReturnsByUser(id: number) : Promise<OweReturn[]>{
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

  // ---------------------------------- Image Upload Methods -------------------------------
  
  async getOweItemById(oweItemId: number): Promise<OweItem> {
    const oweItem = await this.oweItemRepository.findOne({
      where: { id: oweItemId },
      relations: ['fullOwe', 'fullOwe.fromUser', 'oweParticipants', 'oweParticipants.toUser', 'oweParticipants.group'],
    });

    if (!oweItem) {
      throw new NotFoundException(`OweItem with ID ${oweItemId} not found`);
    }

    return oweItem;
  }

  async userHasAccessToOweItem(userId: number, oweItemId: number): Promise<boolean> {
    const oweItem = await this.getOweItemById(oweItemId);

    // Перевіряємо чи користувач є автором боргу
    if (oweItem.fullOwe.fromUser.id === userId) {
      return true;
    }

    // Перевіряємо чи користувач є учасником боргу
    const isParticipant = oweItem.oweParticipants.some(
      participant => participant.toUser?.id === userId
    );

    return isParticipant;
  }

  async updateOweItemImages(oweItemId: number, imageUrls: string[]): Promise<void> {
    await this.oweItemRepository.update(oweItemId, { imageUrls });
  }
}
