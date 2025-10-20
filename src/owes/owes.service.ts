import { Injectable } from '@nestjs/common';

@Injectable()
export class OwesService {
  owesHealthcheck(): object {
    return {message: "Owes Controller is running!"};
  }
}
