import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FullOwe } from 'src/owes/entities/full-owe.entity';
import { OweItem } from 'src/owes/entities/owe-item.entity';
import { OweParticipant } from 'src/owes/entities/owe-partipicipant.entity';
import { OweReturn } from 'src/owes/entities/owe-return.entity';
import { UserRole } from 'src/common/enums';

/**
 * Guard to check if the user is the owner of the debt (fromUser)
 * or an admin. Used for create, update, and delete operations.
 */
@Injectable()
export class OweOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(FullOwe)
    private readonly fullOweRepository: Repository<FullOwe>,
    @InjectRepository(OweItem)
    private readonly oweItemRepository: Repository<OweItem>,
    @InjectRepository(OweParticipant)
    private readonly oweParticipantRepository: Repository<OweParticipant>,
    @InjectRepository(OweReturn)
    private readonly oweReturnRepository: Repository<OweReturn>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;
    const body = request.body;
    const route = request.route.path;
    const method = request.method;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admins can do anything
    if (user.role === UserRole.Admin) {
      return true;
    }

    // Handle POST requests (create operations)
    if (method === 'POST') {
      return await this.handleCreateOperation(user.id, route, body);
    }

    // Handle PUT/DELETE requests (update/delete operations)
    if (method === 'PUT' || method === 'DELETE') {
      return await this.handleModifyOperation(user.id, route, params);
    }

    return false;
  }

  private async handleCreateOperation(userId: number, route: string, body: any): Promise<boolean> {
    // POST /owes/full - user must be fromUser
    if (route === '/owes/full') {
      if (body.fromUserId !== userId) {
        throw new ForbiddenException('You can only create debts from yourself');
      }
      return true;
    }

    // POST /owes/items - user must be owner of the fullOwe
    if (route === '/owes/items') {
      const fullOweId = body.fullOweId;
      if (!fullOweId) {
        throw new ForbiddenException('fullOweId is required');
      }
      return await this.isFullOweOwner(userId, fullOweId);
    }

    // POST /owes/participants - user must be owner of the oweItem
    if (route === '/owes/participants') {
      const oweItemId = body.oweItemId;
      if (!oweItemId) {
        throw new ForbiddenException('oweItemId is required');
      }
      return await this.isOweItemOwner(userId, oweItemId);
    }

    // POST /owes/returns - user must be the participant (toUser)
    if (route === '/owes/returns') {
      const participantId = body.participantId;
      if (!participantId) {
        throw new ForbiddenException('participantId is required');
      }
      return await this.isParticipantUser(userId, participantId);
    }

    return false;
  }

  private async handleModifyOperation(userId: number, route: string, params: any): Promise<boolean> {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      throw new NotFoundException('Invalid resource ID');
    }

    // PUT/DELETE /owes/full/:id - user must be owner
    if (route === '/owes/full/:id') {
      return await this.isFullOweOwner(userId, id);
    }

    // PUT/DELETE /owes/items/:id - user must be owner of parent fullOwe
    if (route === '/owes/items/:id') {
      return await this.isOweItemOwner(userId, id);
    }

    // PUT/DELETE /owes/participants/:id - user must be owner of parent fullOwe
    if (route === '/owes/participants/:id' || route.startsWith('/owes/participants/:id/')) {
      return await this.isParticipantOwner(userId, id);
    }

    // PUT/DELETE /owes/returns/:id - for canceling, user must be participant; for accepting/declining, user must be fullOwe owner
    if (route.startsWith('/owes/returns/:id')) {
      // Cancel operation - must be participant (toUser)
      if (route === '/owes/returns/:id/cancel') {
        return await this.isReturnCreator(userId, id);
      }
      // Accept/Decline operation - must be fullOwe owner
      if (route === '/owes/returns/:id/accept' || route === '/owes/returns/:id/decline') {
        return await this.isReturnOweOwner(userId, id);
      }
      // DELETE - must be either participant or owner
      if (route === '/owes/returns/:id') {
        const isCreator = await this.isReturnCreator(userId, id);
        const isOwner = await this.isReturnOweOwner(userId, id);
        if (!isCreator && !isOwner) {
          throw new ForbiddenException('You can only delete your own returns or returns for your debts');
        }
        return true;
      }
    }

    return false;
  }

  private async isFullOweOwner(userId: number, fullOweId: number): Promise<boolean> {
    const fullOwe = await this.fullOweRepository.findOne({
      where: { id: fullOweId },
      relations: ['fromUser'],
    });

    if (!fullOwe) {
      throw new NotFoundException('Full owe not found');
    }

    if (fullOwe.fromUser.id !== userId) {
      throw new ForbiddenException('You can only modify your own debts');
    }

    return true;
  }

  private async isOweItemOwner(userId: number, oweItemId: number): Promise<boolean> {
    const oweItem = await this.oweItemRepository.findOne({
      where: { id: oweItemId },
      relations: ['fullOwe', 'fullOwe.fromUser'],
    });

    if (!oweItem) {
      throw new NotFoundException('Owe item not found');
    }

    if (oweItem.fullOwe.fromUser.id !== userId) {
      throw new ForbiddenException('You can only modify your own debt items');
    }

    return true;
  }

  private async isParticipantOwner(userId: number, participantId: number): Promise<boolean> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['oweItem', 'oweItem.fullOwe', 'oweItem.fullOwe.fromUser'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.oweItem.fullOwe.fromUser.id !== userId) {
      throw new ForbiddenException('You can only modify participants of your own debts');
    }

    return true;
  }

  private async isParticipantUser(userId: number, participantId: number): Promise<boolean> {
    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['toUser'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.toUser && participant.toUser.id !== userId) {
      throw new ForbiddenException('You can only create returns for your own debt participation');
    }

    return true;
  }

  private async isReturnCreator(userId: number, returnId: number): Promise<boolean> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: returnId },
      relations: ['participant', 'participant.toUser'],
    });

    if (!oweReturn) {
      throw new NotFoundException('Return not found');
    }

    if (oweReturn.participant.toUser && oweReturn.participant.toUser.id !== userId) {
      throw new ForbiddenException('You can only cancel your own returns');
    }

    return true;
  }

  private async isReturnOweOwner(userId: number, returnId: number): Promise<boolean> {
    const oweReturn = await this.oweReturnRepository.findOne({
      where: { id: returnId },
      relations: ['participant', 'participant.oweItem', 'participant.oweItem.fullOwe', 'participant.oweItem.fullOwe.fromUser'],
    });

    if (!oweReturn) {
      throw new NotFoundException('Return not found');
    }

    if (oweReturn.participant.oweItem.fullOwe.fromUser.id !== userId) {
      throw new ForbiddenException('You can only accept/decline returns for your own debts');
    }

    return true;
  }
}
