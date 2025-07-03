// src/posting-rules/posting-rules.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostingRulesService } from './posting-rules.service';
import { PostingRulesController } from './posting-rules.controller';
import { PostingRule } from './entities/posting-rule.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostingRule, User])],
  controllers: [PostingRulesController],
  providers: [PostingRulesService],
})
export class PostingRulesModule {}
