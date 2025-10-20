import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  authHealthcheck(): object {
    return {message: "Auth Controller is running!"};
  }
}
