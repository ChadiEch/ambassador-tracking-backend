import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AmbassadorSummary } from './dto/ambassador-summary.dto';
import { AmbassadorComplianceData } from './dto/ambassador-compliance.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('all-compliance')
  async getAllCompliance(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<AmbassadorSummary[]> {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;
    return this.analyticsService.generateWeeklyCompliance(startDate, endDate);
  }

@Get('team-compliance')
getTeamCompliance(
  @Query('leaderId') leaderId: string,
  @Query('start') start?: string,
  @Query('end') end?: string,
) {
  const from = start ? new Date(start) : undefined;
  const to = end ? new Date(end) : undefined;
  return this.analyticsService.getTeamCompliance(leaderId, from, to);
}




  @Get('weekly-compliance')
  async getComplianceForUser(
    @Query('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<AmbassadorComplianceData> {
    const startDate = from ? new Date(from) : undefined;
    const endDate = to ? new Date(to) : undefined;
    return this.analyticsService.getUserWeeklyCompliance(userId, startDate, endDate);
  }
}
