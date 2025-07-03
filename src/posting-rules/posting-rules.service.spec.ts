import { Test, TestingModule } from '@nestjs/testing';
import { PostingRulesService } from './posting-rules.service';

describe('PostingRulesService', () => {
  let service: PostingRulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostingRulesService],
    }).compile();

    service = module.get<PostingRulesService>(PostingRulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
