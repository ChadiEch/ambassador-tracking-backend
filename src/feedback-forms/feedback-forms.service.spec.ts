import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackFormsService } from './feedback-forms.service';

describe('FeedbackFormsService', () => {
  let service: FeedbackFormsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedbackFormsService],
    }).compile();

    service = module.get<FeedbackFormsService>(FeedbackFormsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
