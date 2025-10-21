import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, passwordHash: string) : Promise<any> {
    const user = await this.usersService.getUserByUsername(username);
    if (user && user.passwordHash === passwordHash) {
      const { passwordHash, ...result } = user;
      return result;
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.validateUser(loginDto.username, loginDto.passwordHash);
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload)
    return { accessToken };
  }

  async register(registerDto: RegisterDto): Promise<any>{
    const user = await this.usersService.createUser(registerDto);
    const { passwordHash, ...result } = user;
    return result;
  }

  authHealthcheck(): object {
    return {message: "Auth Controller is running!"};
  }
}
