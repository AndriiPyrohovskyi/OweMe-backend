import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserChangeLog } from './entities/user-change-log.entity';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserChangeLog])],
  controllers: [UsersController],
  providers: [UsersService, OwnerOrAdminGuard],
  exports: [UsersService]
})

export class UsersModule {}