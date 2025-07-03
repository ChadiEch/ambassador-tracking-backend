import { Test, TestingModule } from '@nestjs/testing';
import { PostingRulesController } from './posting-rules.controller';
import { PostingRulesService } from './posting-rules.service';

describe('PostingRulesController', () => {
  let controller: PostingRulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostingRulesController],
      providers: [PostingRulesService],
    }).compile();

    controller = module.get<PostingRulesController>(PostingRulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
