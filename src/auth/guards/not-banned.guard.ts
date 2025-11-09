import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class NotBannedGuard implements CanActivate {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.id) {
            return true; // Якщо немає user, пускай інші guards обробляють
        }

        const fullUser = await this.usersRepository.findOne({
            where: { id: user.id },
        });

        if (fullUser && fullUser.isBanned) {
            throw new ForbiddenException(
                `Your account has been banned. Reason: ${fullUser.banReason || 'No reason provided'}`
            );
        }

        return true;
    }
}
