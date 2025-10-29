import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AliveService } from './alive.service';
import { CreateAliveDto } from './dto/create-alive.dto';
import { UpdateAliveDto } from './dto/update-alive.dto';

@Controller('alive')
export class AliveController {
  constructor(private readonly aliveService: AliveService) {}

  @Get()
  imAlive() {
    return this.aliveService.imAlive()
  }
}
