import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  usersHealthcheck(): object {
    return {message: "Users Controller is running!"};
  }
}
