import { Module } from '@nestjs/common';
import { AliveService } from './alive.service';
import { AliveController } from './alive.controller';

@Module({
  controllers: [AliveController],
  providers: [AliveService],
})
export class AliveModule {}
