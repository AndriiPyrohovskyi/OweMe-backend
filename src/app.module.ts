import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './config/database';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { GroupsModule } from './groups/groups.module';
import { OwesModule } from './owes/owes.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    DatabaseModule,
    AuthModule,
    FriendsModule,
    GroupsModule,
    OwesModule,
    UsersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
