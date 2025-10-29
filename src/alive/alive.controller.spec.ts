import { Test, TestingModule } from '@nestjs/testing';
import { AliveController } from './alive.controller';
import { AliveService } from './alive.service';

describe('AliveController', () => {
  let controller: AliveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AliveController],
      providers: [AliveService],
    }).compile();

    controller = module.get<AliveController>(AliveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
