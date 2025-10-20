import { Injectable } from '@nestjs/common';

@Injectable()
export class FriendsService {
  friendsHealthcheck(): object {
    return {message: "Friends Controller is running!"};
  }
}
