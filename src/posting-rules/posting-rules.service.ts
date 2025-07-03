import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostingRule } from './entities/posting-rule.entity';
import { CreatePostingRuleDto } from './dto/create-posting-rule.dto';
import { UpdatePostingRuleDto } from './dto/update-posting-rule.dto';

@Injectable()
export class PostingRulesService {
  constructor(
    @InjectRepository(PostingRule)
    private postingRuleRepo: Repository<PostingRule>
  ) {}

  // 🔧 Now 'create' will just update the only rule row
 async create(dto: CreatePostingRuleDto) {
  const rule = await this.postingRuleRepo.findOne({ where: {} });

  if (!rule) {
    throw new NotFoundException('Initial posting rule not found in DB');
  }

  Object.assign(rule, {
    stories_per_week: dto.stories_per_week,
    posts_per_week: dto.posts_per_week,
    reels_per_week: dto.reels_per_week,
    rulesText: (dto as any).rulesText || '',
  });

  await this.postingRuleRepo.save(rule);
  return { message: 'Posting rule updated successfully' };
}

  async findAll() {
    const rules = await this.postingRuleRepo.find();

    return rules.map((r) => ({
      id: r.id,
      stories_per_week: r.stories_per_week,
      posts_per_week: r.posts_per_week,
      reels_per_week: r.reels_per_week,
      rulesText: r.rulesText || '',
    }));
  }

  async update(id: string, dto: UpdatePostingRuleDto) {
    const rule = await this.postingRuleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');

    Object.assign(rule, dto);
    await this.postingRuleRepo.save(rule);
    return { message: 'Posting rule updated successfully' };
  }

  async findOne(id: string) {
    const rule = await this.postingRuleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async remove(id: string) {
    const rule = await this.postingRuleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');

    await this.postingRuleRepo.remove(rule);
    return { message: 'Posting rule deleted' };
  }
}
