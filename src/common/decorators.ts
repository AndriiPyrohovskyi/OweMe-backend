import { SetMetadata } from '@nestjs/common';
import { UserRole } from './enums';

export const Role = (role: UserRole) => SetMetadata('role', role);