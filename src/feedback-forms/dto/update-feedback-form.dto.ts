import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedbackDto  } from './create-feedback-form.dto';

export class UpdateFeedbackFormDto extends PartialType(CreateFeedbackDto ) {}
