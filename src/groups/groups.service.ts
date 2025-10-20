import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupsService {
  groupsHealthcheck(): object {
    return {message: "Groups Controller is running!"};
  }
}
