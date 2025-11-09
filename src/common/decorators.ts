import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from 'src/common/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const TARGET_USER_FIELD_KEY = 'targetUserField';
export const TargetUserField = (field: string) => SetMetadata(TARGET_USER_FIELD_KEY, field);

// Декоратор для специфічних стратегій авторизації
export const AUTH_STRATEGY_KEY = 'authStrategy';
export const AuthStrategy = (strategy: string) => SetMetadata(AUTH_STRATEGY_KEY, strategy);

// Декоратор для визначення ролі користувача у friend request
export const FRIEND_REQUEST_ROLE_KEY = 'friendRequestRole';
export const FriendRequestRole = (role: 'sender' | 'receiver' | 'both') => SetMetadata(FRIEND_REQUEST_ROLE_KEY, role);

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);