import { PartialType } from '@nestjs/mapped-types';
import { CreatePostingRuleDto } from './create-posting-rule.dto';

export class UpdatePostingRuleDto extends PartialType(CreatePostingRuleDto) {}
