import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FeedbackFormsService } from './feedback-forms.service';
import { CreateFeedbackDto } from './dto/create-feedback-form.dto';
import { UpdateFeedbackFormDto } from './dto/update-feedback-form.dto';

@Controller('feedback-forms')
export class FeedbackFormsController {
  constructor(private readonly feedbackFormsService: FeedbackFormsService) {}

  @Post()
  create(@Body() createFeedbackFormDto: CreateFeedbackDto) {
    return this.feedbackFormsService.create(createFeedbackFormDto);
  }

  @Get()
  findAll() {
    return this.feedbackFormsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.feedbackFormsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFeedbackFormDto: UpdateFeedbackFormDto) {
    return this.feedbackFormsService.update(+id, updateFeedbackFormDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feedbackFormsService.remove(+id);
  }
  @Patch(':id/toggle-archive')
toggleArchive(@Param('id') id: string) {
  return this.feedbackFormsService.toggleArchive(id);
}

}
