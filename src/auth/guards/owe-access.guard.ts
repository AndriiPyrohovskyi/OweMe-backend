import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FullOwe } from 'src/owes/entities/full-owe.entity';
import { OweItem } from 'src/owes/entities/owe-item.entity';
import { OweParticipant } from 'src/owes/entities/owe-partipicipant.entity';
import { OweReturn } from 'src/owes/entities/owe-return.entity';
import { GroupMember } from 'src/groups/entities/group-member.entity';
import { UserRole } from 'src/common/enums';

@Injectable()
export class OweAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(FullOwe)
    private readonly fullOweRepository: Repository<FullOwe>,
    @InjectRepository(OweItem)
    private readonly oweItemRepository: Repository<OweItem>,
    @InjectRepository(OweParticipant)
    private readonly oweParticipantRepository: Repository<OweParticipant>,
    @InjectRepository(OweReturn)
    private readonly oweReturnRepository: Repository<OweReturn>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;
    const route = request.route.path;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Якщо користувач адмін - дозволяємо все
    if (user.role === UserRole.Admin) {
      return true;
    }

    // Визначаємо тип ресурсу та ID
    let resourceId: number;
    let resourceType: 'fullOwe' | 'oweItem' | 'participant' | 'return';

    // Перевіряємо точні шляхи з числовим ID
    if (route === '/owes/full/:id') {
      resourceId = parseInt(params.id);
      resourceType = 'fullOwe';
    } else if (route === '/owes/items/:id') {
      resourceId = parseInt(params.id);
      resourceType = 'oweItem';
    } else if (route === '/owes/participants/:id') {
      resourceId = parseInt(params.id);
      resourceType = 'participant';
    } else if (route === '/owes/returns/:id') {
      resourceId = parseInt(params.id);
      resourceType = 'return';
    } else {
      // Для інших ендпоінтів (списки, /my, /user/:userId, тощо) - дозволяємо
      return true;
    }

    // Перевіряємо, чи ID є валідним числом
    if (isNaN(resourceId)) {
      throw new NotFoundException('Invalid resource ID');
    }

    return await this.checkAccess(user.id, resourceId, resourceType);
  }

  private async checkAccess(
    userId: number,
    resourceId: number,
    resourceType: 'fullOwe' | 'oweItem' | 'participant' | 'return'
  ): Promise<boolean> {
    switch (resourceType) {
      case 'fullOwe':
        return await this.checkFullOweAccess(userId, resourceId);
      case 'oweItem':
        return await this.checkOweItemAccess(userId, resourceId);
      case 'participant':
        return await this.checkParticipantAccess(userId, resourceId);
      case 'return':
        return await this.checkReturnAccess(userId, resourceId);
      default:
        return false;
    }
  }

  private async checkFullOweAccess(userId: number, fullOweId: number): Promise<boolean> {
    const fullOwe = await this.fullOweRepository.findOne({
      where: { id: fullOweId },
      relations: ['fromUser', 'oweItems', 'oweItems.oweParticipants', 'oweItems.oweParticipants.toUser', 'oweItems.oweParticipants.group'],
    });

    if (!fullOwe) {
      throw new NotFoundException('Full owe not found');
    }

    // Перевірка: чи користувач є власником боргу
    if (fullOwe.fromUser.id === userId) {
      return true;
    }

    // Перевірка: чи користувач є учасником боргу
    for (const item of fullOwe.oweItems) {
      for (const participant of item.oweParticipants) {
        if (participant.toUser && participant.toUser.id === userId) {
          return true;
        }

        // Перевірка: чи борг належить до групи, в якій користувач є членом
        if (participant.group) {
          const isMember = await this.isUserInGroup(userId, participant.group.id);
          if (isMember) {
            return true;
          }
        }
      }
    }

    throw new ForbiddenException('You do not have access to this owe');
  }

  private async checkOweItemAccess(userId: number, oweItemId: number): Promise<boolean> {
    const oweItem = await this.oweItemRepository.findOne({
      where: { id: oweItemId },
      relations: ['fullOwe', 'fullOwe.fromUser', 'oweParticipants', 'oweParticipants.toUser', 'oweParticipants.group'],
    });

    if (!oweItem) {
      throw new NotFoundException('Owe item not found');
    }

    // Перевірка: чи користувач є власником боргу
    if (oweItem.fullOwe.fromUser.id === userId) {
      return true;
    }

    // Перевірка: чи користувач є учасником цього пункту боргу
    for (const participant of oweItem.oweParticipants) {
      if (participant.toUser && participant.toUser.id === userId) {
        return true;
      }

      // Перевірка: чи пункт боргу належить до групи, в якій користувач є членом
      if (participant.group) {
        const isMember = await this.isUserInGroup(userId, participant.group.id);
        if (isMember) {
          return true;
        }
      }
    }

    throw new ForbiddenException('You do not have access to this owe item');
  }

  private async checkParticipantAccess(userId: number, participantId: number): Promise<boolean> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser', 'toUser', 'group'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Перевірка: чи користувач є власником боргу
    if (participant.oweItem.fullOwe.fromUser.id === userId) {
      return true;
    }

    // Перевірка: чи користувач є самим учасником
    if (participant.toUser && participant.toUser.id === userId) {
      return true;
    }

    // Перевірка: чи учасник належить до групи, в якій користувач є членом
    if (participant.group) {
      const isMember = await this.isUserInGroup(userId, participant.group.id);
      if (isMember) {
        return true;
      }
    }

    throw new ForbiddenException('You do not have access to this participant');
  }

  private async checkReturnAccess(userId: number, returnId: number): Promise<boolean> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: returnId },
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser', 'participant.toUser', 'participant.group'],
    });

    if (!oweReturn) {
      throw new NotFoundException('Owe return not found');
    }

    // Перевірка: чи користувач є власником боргу
    if (oweReturn.participant.oweItem.fullOwe.fromUser.id === userId) {
      return true;
    }

    // Перевірка: чи користувач є учасником, який повертає борг
    if (oweReturn.participant.toUser && oweReturn.participant.toUser.id === userId) {
      return true;
    }

    // Перевірка: чи повернення належить до групи, в якій користувач є членом
    if (oweReturn.participant.group) {
      const isMember = await this.isUserInGroup(userId, oweReturn.participant.group.id);
      if (isMember) {
        return true;
      }
    }

    throw new ForbiddenException('You do not have access to this owe return');
  }

  private async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    const membership = await this.groupMemberRepository.findOne({
      where: {
        user: { id: userId },
        group: { id: groupId },
      },
    });

    return !!membership;
  }
}
