import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { AliveModule } from './alive/alive.module';

@Module({
  imports: [ChatModule, AliveModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
