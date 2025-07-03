import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackFormsController } from './feedback-forms.controller';
import { FeedbackFormsService } from './feedback-forms.service';

describe('FeedbackFormsController', () => {
  let controller: FeedbackFormsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackFormsController],
      providers: [FeedbackFormsService],
    }).compile();

    controller = module.get<FeedbackFormsController>(FeedbackFormsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
