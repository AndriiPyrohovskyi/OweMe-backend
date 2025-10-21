import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { RegisterDto } from 'src/auth/dto/register.dto';

@Injectable()
export class UsersService {
  createUser(registerDto: RegisterDto): User {
    const user = new User();
    user.username = registerDto.username;
    user.passwordHash = registerDto.password; // Тут краще хешувати пароль
    user.email = registerDto.email;
    return user;
  }
  findByUsername(username: string) {
    return new User();
  }
  usersHealthcheck(): object {
    return {message: "Users Controller is running!"};
  }
}
