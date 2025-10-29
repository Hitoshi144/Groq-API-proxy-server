import { Test, TestingModule } from '@nestjs/testing';
import { AliveService } from './alive.service';

describe('AliveService', () => {
  let service: AliveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AliveService],
    }).compile();

    service = module.get<AliveService>(AliveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
