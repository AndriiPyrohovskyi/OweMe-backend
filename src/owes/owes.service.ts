import { Injectable } from '@nestjs/common';
import { FullOwe } from './entities/full-owe.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageOweMention } from './entities/message-owe-mention.entity';
import { OweItem } from './entities/owe-item.entity';
import { OweParticipant } from './entities/owe-partipicipant.entity';
import { OweReturn } from './entities/owe-return.entity';

@Injectable()
export class OwesService {
    constructor (
      @InjectRepository(FullOwe)
      private readonly fullOwe: Repository<FullOwe>,
  
      @InjectRepository(MessageOweMention)
      private readonly messageOweMention: Repository<MessageOweMention>,

      @InjectRepository(OweItem)
      private readonly oweItem: Repository<OweItem>,

      @InjectRepository(OweParticipant)
      private readonly oweParticipant: Repository<OweParticipant>,

      @InjectRepository(OweReturn)
      private readonly oweReturn: Repository<OweReturn>,
    ){}
  owesHealthcheck(): object {
    return {message: "Owes Controller is running!"};
  }
  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  // ---------------------------------- Delete Methods -------------------------------------
  // ---------------------------------- Delete Methods -------------------------------------
  // ---------------------------------- Get Methods ----------------------------------------
  async getAllFullOwes() : Promise<FullOwe[]> {
    return await this.fullOwe.find();
  }
  // ---------------------------------- Get Methods ----------------------------------------
}
