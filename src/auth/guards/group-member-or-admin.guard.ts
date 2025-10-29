import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMember } from 'src/groups/entities/group-member.entity';
import { UserRole } from 'src/common/enums';

@Injectable()
export class GroupMemberOrAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Якщо користувач адмін - дозволяємо все
    if (user.role === UserRole.Admin) {
      return true;
    }

    // Отримуємо groupId з параметрів
    const groupId = parseInt(params.groupId);
    
    if (isNaN(groupId)) {
      throw new NotFoundException('Invalid group ID');
    }

    // Перевіряємо, чи користувач є членом групи
    const membership = await this.groupMemberRepository.findOne({
      where: {
        user: { id: user.id },
        group: { id: groupId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return true;
  }
}
