import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OweParticipant } from 'src/owes/entities/owe-partipicipant.entity';
import { UserRole } from 'src/common/enums';

/**
 * Guard to check if the user is the participant (toUser) of a debt
 * or an admin. Used for accepting/declining debt participation.
 */
@Injectable()
export class ParticipantUserGuard implements CanActivate {
  constructor(
    @InjectRepository(OweParticipant)
    private readonly oweParticipantRepository: Repository<OweParticipant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admins can do anything
    if (user.role === UserRole.Admin) {
      return true;
    }

    const participantId = parseInt(params.id);
    if (isNaN(participantId)) {
      throw new NotFoundException('Invalid participant ID');
    }

    const participant = await this.oweParticipantRepository.findOne({
      where: { id: participantId },
      relations: ['toUser'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.toUser && participant.toUser.id !== user.id) {
      throw new ForbiddenException('You can only manage your own debt participation');
    }

    return true;
  }
}
