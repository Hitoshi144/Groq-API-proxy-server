import { Injectable, Logger } from '@nestjs/common';
import { CreateAliveDto } from './dto/create-alive.dto';
import { UpdateAliveDto } from './dto/update-alive.dto';

@Injectable()
export class AliveService {
  private readonly logger = new Logger(AliveService.name)

  imAlive() {
    return 'Server is alive!'
  }
}
