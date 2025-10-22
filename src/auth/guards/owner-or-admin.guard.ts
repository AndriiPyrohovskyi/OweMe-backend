import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/common/enums';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    // Перевіряємо роль користувача через changeLogsIn
    let userRole = UserRole.User;
    if (user.changeLogsIn && user.changeLogsIn.length > 0) {
      userRole = user.changeLogsIn[user.changeLogsIn.length - 1]?.newRole || UserRole.User;
    }

    // Якщо користувач адмін, дозволяємо доступ
    if (userRole === UserRole.Admin) {
      return true;
    }

    // Отримуємо ID з різних джерел залежно від типу запиту
    let targetUserId: number | undefined;

    // Спробуємо отримати ID з параметрів URL
    if (request.params && request.params.id) {
      targetUserId = parseInt(request.params.id, 10);
    }
    // Спробуємо отримати ID з тіла запиту
    else if (request.body && request.body.id) {
      targetUserId = request.body.id;
    }
    // Спробуємо отримати username з тіла запиту і знайти користувача
    else if (request.body && request.body.username) {
      const targetUser = await this.usersService.getUserByUsername(request.body.username);
      targetUserId = targetUser.id;
    }

    // Якщо не можемо визначити цільового користувача, блокуємо доступ
    if (!targetUserId) {
      throw new ForbiddenException('Cannot determine target user for authorization');
    }

    // Перевіряємо, чи користувач має доступ до власного ресурсу
    if (user.id === targetUserId) {
      return true;
    }

    throw new ForbiddenException('You do not have permission to perform this action');
  }
}