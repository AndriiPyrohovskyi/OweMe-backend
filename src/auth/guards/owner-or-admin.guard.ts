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
    const user = request.user; // JWT додає користувача в request після авторизації
    const { id } = request.body; // ID користувача, який оновлюється/видаляється

    if (!user) {
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    // Якщо користувач — адміністратор, дозволяємо доступ
    if (user.role === UserRole.Admin) {
      return true;
    }

    // Якщо користувач намагається змінити свій профіль, дозволяємо доступ
    if (user.id === id) {
      return true;
    }

    throw new ForbiddenException('You do not have permission to perform this action');
  }
}