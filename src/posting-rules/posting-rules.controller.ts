import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostingRulesService } from './posting-rules.service';
import { CreatePostingRuleDto } from './dto/create-posting-rule.dto';
import { UpdatePostingRuleDto } from './dto/update-posting-rule.dto';

@Controller('posting-rules')
export class PostingRulesController {
  constructor(private readonly postingRulesService: PostingRulesService) {}

  // Create a rule for a specific user
  @Post()
  create(@Body() createPostingRuleDto: CreatePostingRuleDto) {
    return this.postingRulesService.create(createPostingRuleDto);
  }

  // Get all rules (admin view)
  @Get()
  findAll() {
    return this.postingRulesService.findAll();
  }


  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostingRuleDto: UpdatePostingRuleDto) {
    return this.postingRulesService.update(id, updatePostingRuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postingRulesService.remove(id);
  }
}
