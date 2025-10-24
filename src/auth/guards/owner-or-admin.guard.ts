import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/common/enums';
import { TARGET_USER_FIELD_KEY, FRIEND_REQUEST_ROLE_KEY } from 'src/common/decorators';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('You are not authorized to perform this action');
    }

    // Перевіряємо чи є користувач адміністратором
    let userRole = UserRole.User;
    if (user.changeLogsIn && user.changeLogsIn.length > 0) {
      userRole = user.changeLogsIn[user.changeLogsIn.length - 1]?.newRole || UserRole.User;
    }
    
    if (userRole === UserRole.Admin) {
      return true;
    }

    // Перевіряємо чи є декоратор для friend request
    const friendRequestRole = this.reflector.get<string>(FRIEND_REQUEST_ROLE_KEY, context.getHandler());
    if (friendRequestRole) {
      return this.handleFriendRequestAuth(request, user, friendRequestRole);
    }

    // Стандартна авторизація власника
    return this.handleOwnerAuth(request, user, context);
  }

  private handleFriendRequestAuth(request: any, user: any, friendRequestRole: string): boolean {
    // Для friend requests просто дозволяємо - детальну перевірку робитимемо на рівні сервісу
    console.log('Friend request auth - allowing access for detailed check in service');
    return true;
  }

  private handleOwnerAuth(request: any, user: any, context: ExecutionContext): boolean {
    // Отримуємо поле для порівняння з метаданих
    const targetUserField = this.reflector.get<string>(TARGET_USER_FIELD_KEY, context.getHandler());
    const targetUserId = this.getTargetUserId(request, targetUserField);
    
    if (!targetUserId) {
      throw new ForbiddenException('Cannot determine target user for authorization');
    }

    // Перевіряємо чи поточний користувач є власником ресурсу
    if (user.id === targetUserId) {
      return true;
    }

    throw new ForbiddenException('You do not have permission to perform this action');
  }

  private getTargetUserId(request: any, targetUserField?: string): number | undefined {
    // Якщо поле вказано явно, шукаємо його
    if (targetUserField) {
      // Шукаємо в params
      if (request.params && request.params[targetUserField]) {
        return parseInt(request.params[targetUserField], 10);
      }
      
      // Шукаємо в body
      if (request.body && request.body[targetUserField]) {
        return parseInt(request.body[targetUserField], 10);
      }
      
      // Шукаємо в query
      if (request.query && request.query[targetUserField]) {
        return parseInt(request.query[targetUserField], 10);
      }
    }

    // Стандартні поля за замовчуванням
    // 1. Параметри URL
    if (request.params) {
      if (request.params.id) return parseInt(request.params.id, 10);
      if (request.params.targetUserId) return parseInt(request.params.targetUserId, 10);
      if (request.params.targetedUserId) return parseInt(request.params.targetedUserId, 10);
    }

    // 2. Тіло запиту
    if (request.body) {
      if (request.body.id) return parseInt(request.body.id, 10);
      if (request.body.targetUserId) return parseInt(request.body.targetUserId, 10);
      if (request.body.targetedUserId) return parseInt(request.body.targetedUserId, 10);
    }

    // 3. Query параметри
    if (request.query) {
      if (request.query.targetUserId) return parseInt(request.query.targetUserId, 10);
      if (request.query.targetedUserId) return parseInt(request.query.targetedUserId, 10);
    }

    return undefined;
  }
}