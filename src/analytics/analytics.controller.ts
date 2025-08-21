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
): Promise<any> {
  const startDate = from ? new Date(from) : undefined;
  const endDate = to ? new Date(to) : undefined;

  const compliance = await this.analyticsService.getUserWeeklyCompliance(userId, startDate, endDate);

  const user = await this.analyticsService['userRepo'].findOne({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  return {
    ...compliance,
    name: user.name,
    photoUrl: user.photoUrl,
  };
}

 @Get('monthly-activity')
async getMonthlyActivity(
  @Query('leaderId') leaderId?: string,
) {
  if (leaderId) {
    return this.analyticsService.getMonthlyActivityForTeam(leaderId);
  }
  return this.analyticsService.getMonthlyActivity();
}

@Get('team-activity')
getTeamActivity() {
  return this.analyticsService.getTeamMonthlyActivity(); 
}



  // ✅ 2. Admin - Monthly activity per team
  @Get('team-monthly-activity')
  getTeamMonthlyActivity() {
    return this.analyticsService.getTeamMonthlyActivity();
  }

  // ✅ 3. Admin - Team contribution pie chart data
  @Get('team-contribution')
  getTeamContributionPie() {
    return this.analyticsService.getTeamContributionPie();
  }

  @Get('compliance-by-team')
getComplianceByTeam() {
  return this.analyticsService.getCompliancePerTeam(); // or whatever the service function is
}


  // ✅ 4. Admin - Count of ambassadors fully compliant
  @Get('overall-compliance-rate')
  getOverallComplianceRate(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const from = start ? new Date(start) : undefined;
    const to = end ? new Date(end) : undefined;
    return this.analyticsService.getOverallComplianceRate(from, to);
  }

  // ✅ 5. Leader - Count of compliant users in their team
  @Get('team-compliance-count')
  getTeamComplianceRate(
    @Query('leaderId') leaderId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const from = start ? new Date(start) : undefined;
    const to = end ? new Date(end) : undefined;
    return this.analyticsService.getTeamComplianceRate(leaderId, from, to);
  }
  @Get('team-compliance-stats')
  async getTeamComplianceStats(
    @Query('leaderId') leaderId: string,
  ) {
    return this.analyticsService.getTeamComplianceTrend(leaderId);
  }

}
