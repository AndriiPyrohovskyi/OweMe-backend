import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/decorators';
import { UserRole } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    
    if (!user) {
      return false;
    }
    
    let userRole = UserRole.User;
    if (user.changeLogsIn && user.changeLogsIn.length > 0) {
      userRole = user.changeLogsIn[user.changeLogsIn.length - 1]?.newRole || UserRole.User;
    }
    
    return requiredRoles.includes(userRole);
  }
}