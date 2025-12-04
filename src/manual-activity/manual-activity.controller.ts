import { Controller, Post, Body, Get, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ManualActivityService } from './manual-activity.service';
import { CreateManualActivityDto } from './dto/create-manual-activity.dto';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';

@Controller('manual-activity')
export class ManualActivityController {
  constructor(private readonly manualActivityService: ManualActivityService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createManualActivity(
    @Body() createManualActivityDto: CreateManualActivityDto,
  ): Promise<AmbassadorActivity> {
    return this.manualActivityService.createManualActivity(createManualActivityDto);
  }

  @Get('user/:userId')
  async getManualActivities(
    @Param('userId') userId: string,
  ): Promise<AmbassadorActivity[]> {
    return this.manualActivityService.getManualActivities(userId);
  }
}