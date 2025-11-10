import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { UsersModule } from 'src/users/users.module';
import { GroupsModule } from 'src/groups/groups.module';
import { OwesModule } from 'src/owes/owes.module';

@Module({
  imports: [UsersModule, GroupsModule, OwesModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
