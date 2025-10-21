import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  async createUser(registerDto: RegisterDto): Promise<User> {
    const user = this.usersRepository.create(registerDto);
    return await this.usersRepository.save(user);
  }
  findByUsername(username: string) {
    return new User();
  }
  usersHealthcheck(): object {
    return {message: "Users Controller is running!"};
  }
}
