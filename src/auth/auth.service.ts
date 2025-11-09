import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly walletService: WalletService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      return await bcrypt.hash(password, saltRounds);
    }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.getFullUserByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid username'); // Кидаємо помилку, якщо користувач не знайдений
    }

    const isPasswordValid = await this.comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      
      throw new UnauthorizedException('Invalid password'); // Кидаємо помилку, якщо пароль неправильний
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  private async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload)
    return { accessToken };
  }

  async register(registerDto: RegisterDto): Promise<any> {
    let { password, ...data } = registerDto;
    password = await this.hashPassword(password);
    const user = await this.usersService.createUser({ ...data, password });
    
    // Автоматично створюємо wallet для нового користувача
    try {
      await this.walletService.createWallet(user);
    } catch (error) {
      console.error('Failed to create wallet for new user:', error);
      // Wallet creation failed, but user is created. Can retry later.
    }
    
    const { passwordHash: _, ...result } = user;
    return result;
  }

  authHealthcheck(): object {
    return {message: "Auth Controller is running!"};
  }
}
