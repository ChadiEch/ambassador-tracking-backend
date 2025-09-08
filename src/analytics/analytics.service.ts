import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common/exceptions/internal-server-error.exception';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';
import { PostingRule } from '../posting-rules/entities/posting-rule.entity';
import type { AmbassadorSummary } from './dto/ambassador-summary.dto';
import { AmbassadorComplianceData } from './dto/ambassador-compliance.dto';
import { Team } from 'src/teams/entities/team.entity';
import { Warning } from 'src/warnings/entities/warning.entity';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

type TeamContribution = {
  teamId: string;
  [mediaType: string]: number | string;
};
 
export interface DashboardStats {
  totalAmbassadors: number;
  activeAmbassadors: number;
  totalTeams: number;
  overallComplianceRate: number;
  thisWeekActivity: number;
  lastWeekActivity: number;
  activeWarnings: number;
}

export interface ActivityTrend {
  date: string;
  stories: number;
  posts: number;
  reels: number;
  total: number;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  memberCount: number;
  complianceRate: number;
  totalActivity: number;
  avgActivityPerMember: number;
  stories: number;
  posts: number;
  reels: number;
}

export interface UserEngagement {
  userId: string;
  userName: string;
  teamName?: string;
  totalActivity: number;
  stories: number;
  posts: number;
  reels: number;
  complianceScore: number;
  lastActivity?: Date;
  warningCount: number;
  isActive: boolean;
}

export interface ComplianceTrend {
  period: string;
  compliantUsers: number;
  totalUsers: number;
  complianceRate: number;
}

export interface ActivityDistribution {
  mediaType: string;
  count: number;
  percentage: number;
};

export interface TopPerformers {
  userId: string;
  userName: string;
  teamName?: string;
  totalActivity: number;
  complianceScore: number;
}

export interface InactiveUsers {
  userId: string;
  userName: string;
  teamName?: string;
  lastActivity?: Date;
  daysSinceLastActivity: number;
  warningCount: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AmbassadorActivity)
    private activityRepo: Repository<AmbassadorActivity>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(PostingRule)
    private rulesRepo: Repository<PostingRule>,

    @InjectRepository(Team)
    private teamRepo: Repository<Team>,

    @InjectRepository(Warning)
    private warningRepo: Repository<Warning>,
  ) {}

async generateWeeklyCompliance(startDate?: Date, endDate?: Date): Promise<AmbassadorSummary[]> {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - now.getDay());

  const from = startDate || defaultStart;
  const to = endDate || now;

  const users = await this.userRepo.find();
  const globalRule = await this.rulesRepo.findOne({ where: {} });
  const results: AmbassadorSummary[] = [];

  for (const user of users) {
    const counts = await this.activityRepo
      .createQueryBuilder('a')
      .select('a.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .where('a.userInstagramId = :uid', { uid: user.instagram })
      .andWhere('a.timestamp BETWEEN :start AND :end', {
        start: from.toISOString(),
        end: to.toISOString(),
      })
      .groupBy('a.mediaType')
      .getRawMany();

    const countMap: Record<string, number> = {
      STORY: 0,
      IMAGE: 0,
      VIDEO: 0,
    };

    for (const row of counts) {
      countMap[row.mediaType.toUpperCase()] = parseInt(row.count, 10);
    }

    // ✅ Get last activity timestamp for the user
    const lastActivity = await this.activityRepo
      .createQueryBuilder('a')
      .select('a.timestamp', 'timestamp')
      .where('a.userInstagramId = :uid', { uid: user.instagram })
      .orderBy('a.timestamp', 'DESC')
      .limit(1)
      .getRawOne();

    results.push({
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
      role: user.role,
      active: user.active,
      edits: [], // if needed
      actual: {
        stories: countMap.STORY,
        posts: countMap.IMAGE,
        reels: countMap.VIDEO,
      },
      expected: {
        stories: globalRule?.stories_per_week ?? 3,
        posts: globalRule?.posts_per_week ?? 1,
        reels: globalRule?.reels_per_week ?? 1,
      },
      compliance: {
        story: countMap.STORY >= (globalRule?.stories_per_week ?? 3) ? 'green' : 'red',
        post: countMap.IMAGE >= (globalRule?.posts_per_week ?? 1) ? 'green' : 'red',
        reel: countMap.VIDEO >= (globalRule?.reels_per_week ?? 1) ? 'green' : 'red',
      },
      // ✅ Add lastActivity field
      lastActivity: lastActivity?.timestamp || null,
    });
  }

  return results;
}


  async getMonthlyActivity(): Promise<Record<string, Record<string, number>>> {
    const raw = await this.activityRepo
      .createQueryBuilder('a')
      .select("DATE_TRUNC('month', a.timestamp)", 'month')
      .addSelect('a.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('month')
      .addGroupBy('a.mediaType')
      .orderBy('month', 'ASC')
      .getRawMany();

    const result: Record<string, Record<string, number>> = {};

    for (const row of raw) {
      const month = row.month.toISOString().slice(0, 7);
      const media = row.mediaType.toUpperCase();
      result[month] ??= { STORY: 0, IMAGE: 0, VIDEO: 0, REEL: 0 };
      result[month][media] = parseInt(row.count, 10);
    }

    return result;
  }

  async getTeamMonthlyActivity(): Promise<Record<string, Record<string, Record<string, number>>>> {
    const raw = await this.activityRepo
      .createQueryBuilder('a')
      .leftJoin('a.user', 'user')
      .leftJoin('user.teamMemberships', 'membership')
      .leftJoin('membership.team', 'team')
      .select("DATE_TRUNC('month', a.timestamp)", 'month')
      .addSelect('team.id', 'teamId')
      .addSelect('a.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('month')
      .addGroupBy('team.id')
      .addGroupBy('a.mediaType')
      .orderBy('month', 'ASC')
      .getRawMany();

    const result: Record<string, Record<string, Record<string, number>>> = {};

    for (const row of raw) {
      if (!row.teamId) continue;
      const teamId = row.teamId;
      const month = row.month.toISOString().slice(0, 7);
      const media = row.mediaType.toUpperCase();

      result[teamId] ??= {};
      result[teamId][month] ??= { STORY: 0, IMAGE: 0, VIDEO: 0, REEL: 0 };
      result[teamId][month][media] = parseInt(row.count, 10);
    }

    return result;
  }

  
async getCompliancePerTeam(): Promise<{ team: string; complianceRate: number }[]> {
  const teams = await this.teamRepo.find({ relations: ['members'] }); // 'members', not 'users'
  const results: { team: string; complianceRate: number }[] = [];

  for (const team of teams) {
    let compliantUsers = 0;

    for (const user of team.members) {
      const activities = await this.activityRepo.find({
        where: { user: { id: user.id } },
      });

      const hasStory = activities.some(a => a.mediaType === 'story');
      const hasPost = activities.some(a => a.mediaType === 'post');
      const hasReel = activities.some(a => a.mediaType === 'reel');

      if (hasStory && hasPost && hasReel) {
        compliantUsers++;
      }
    }

    const complianceRate = team.members.length
      ? (compliantUsers / team.members.length) * 100
      : 0;

    results.push({ team: team.name, complianceRate });
  }

  return results;
}

  async getTeamContributionPie(): Promise<TeamContribution[]> {
  const raw = await this.activityRepo
    .createQueryBuilder('a')
    .leftJoin('a.user', 'user')
    .leftJoin('user.teamMemberships', 'membership')
    .leftJoin('membership.team', 'team')
    .select('team.id', 'teamId')
    .addSelect('a.mediaType', 'mediaType')
    .addSelect('COUNT(*)', 'count')
    .groupBy('team.id')
    .addGroupBy('a.mediaType')
    .getRawMany();

  const resultMap: Record<string, Record<string, number>> = {};

  for (const row of raw) {
    if (!row.teamId) continue;
    const teamId = row.teamId;
    const media = row.mediaType.toUpperCase();

    resultMap[teamId] ??= {};
    resultMap[teamId][media] = parseInt(row.count, 10);
  }

  const resultArray: TeamContribution[] = Object.entries(resultMap).map(
    ([teamId, mediaCounts]) => ({
      teamId,
      ...mediaCounts,
    }),
  );

  return resultArray;
}


  async getOverallComplianceRate(start?: Date, end?: Date): Promise<number> {
    const all = await this.generateWeeklyCompliance(start, end);
    return all.filter((a) =>
      a.compliance.story === 'green' &&
      a.compliance.post === 'green' &&
      a.compliance.reel === 'green'
    ).length;
  }

  async getTeamComplianceRate(leaderId: string, start?: Date, end?: Date): Promise<number> {
    const teamResults = await this.getTeamCompliance(leaderId, start, end);
    return teamResults.filter((a) =>
      a.compliance.story === 'green' &&
      a.compliance.post === 'green' &&
      a.compliance.reel === 'green'
    ).length;
  }

  async getUserWeeklyCompliance(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AmbassadorComplianceData> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const globalRule = await this.rulesRepo.findOne({ where: {} });
    const now = new Date();
    const from = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const to = endDate || now;

    const counts = await this.activityRepo
      .createQueryBuilder('a')
      .select('a.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .where('a.userInstagramId = :uid', { uid: user.instagram })
      .andWhere('a.timestamp BETWEEN :start AND :end', {
        start: from.toISOString(),
        end: to.toISOString(),
      })
      .groupBy('a.mediaType')
      .getRawMany();

    const countMap: Record<string, number> = {
      STORY: 0,
      IMAGE: 0,
      VIDEO: 0,
    };

    for (const row of counts) {
      countMap[row.mediaType.toUpperCase()] = parseInt(row.count, 10);
    }

    return {
      actual: {
        stories: countMap.STORY,
        posts: countMap.IMAGE,
        reels: countMap.VIDEO,
      },
      expected: {
        stories: globalRule?.stories_per_week ?? 3,
        posts: globalRule?.posts_per_week ?? 1,
        reels: globalRule?.reels_per_week ?? 1,
      },
      compliance: {
        story: countMap.STORY >= (globalRule?.stories_per_week ?? 3) ? 'green' : 'red',
        post: countMap.IMAGE >= (globalRule?.posts_per_week ?? 1) ? 'green' : 'red',
        reel: countMap.VIDEO >= (globalRule?.reels_per_week ?? 1) ? 'green' : 'red',
      },
    };
  }

  async getTeamCompliance(leaderId: string, startDate?: Date, endDate?: Date): Promise<AmbassadorSummary[]> {
    const now = new Date();
    const from = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const to = endDate || now;

    const team = await this.teamRepo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('team.leaderId = :leaderId', { leaderId })
      .getOne();

    if (!team) return [];

    const globalRule = await this.rulesRepo.findOne({ where: {} });
    const results: AmbassadorSummary[] = [];

    for (const member of team.members) {
      const counts = await this.activityRepo
        .createQueryBuilder('a')
        .select('a.mediaType', 'mediaType')
        .addSelect('COUNT(*)', 'count')
        .where('a.userInstagramId = :uid', { uid: member.user.instagram })
        .andWhere('a.timestamp BETWEEN :start AND :end', {
          start: from.toISOString(),
          end: to.toISOString(),
        })
        .groupBy('a.mediaType')
        .getRawMany();

      const countMap = { STORY: 0, IMAGE: 0, VIDEO: 0 };
      for (const row of counts) {
        countMap[row.mediaType.toUpperCase()] = parseInt(row.count, 10);
      }

      results.push({
        id: member.user.id,
        name: member.user.name,
        photoUrl: member.user.photoUrl,
        role: member.user.role,
        active: member.user.active,
        edits: [],
        actual: {
          stories: countMap.STORY,
          posts: countMap.IMAGE,
          reels: countMap.VIDEO,
        },
        expected: {
          stories: globalRule?.stories_per_week ?? 3,
          posts: globalRule?.posts_per_week ?? 1,
          reels: globalRule?.reels_per_week ?? 1,
        },
        compliance: {
          story: countMap.STORY >= (globalRule?.stories_per_week ?? 3) ? 'green' : 'red',
          post: countMap.IMAGE >= (globalRule?.posts_per_week ?? 1) ? 'green' : 'red',
          reel: countMap.VIDEO >= (globalRule?.reels_per_week ?? 1) ? 'green' : 'red',
        },
      });
    }

    return results;
  }

  async getMonthlyActivityForTeam(leaderId: string) {
    const team = await this.teamRepo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('team.leaderId = :leaderId', { leaderId })
      .getOne();

    if (!team) return [];

    const instagramIds = team.members.map(m => m.user.instagram);
    if (instagramIds.length === 0) return [];

    const result = await this.activityRepo
      .createQueryBuilder('activity')
      .select("TO_CHAR(activity.timestamp, 'YYYY-MM')", 'month')
      .addSelect('activity.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .where('activity.userInstagramId IN (:...instagramIds)', { instagramIds })
      .groupBy("TO_CHAR(activity.timestamp, 'YYYY-MM')")
      .addGroupBy('activity.mediaType')
      .orderBy("TO_CHAR(activity.timestamp, 'YYYY-MM')")
      .getRawMany();

    const grouped: Record<string, { stories: number; posts: number; reels: number }> = {};
    for (const row of result) {
      const month = row.month;
      const media = row.mediaType.toUpperCase();
      const count = parseInt(row.count, 10);

      if (!grouped[month]) {
        grouped[month] = { stories: 0, posts: 0, reels: 0 };
      }

      if (media === 'STORY') grouped[month].stories += count;
      if (media === 'IMAGE') grouped[month].posts += count;
      if (media === 'VIDEO') grouped[month].reels += count;
    }

    return Object.entries(grouped).map(([month, counts]) => ({ month, ...counts }));
  }

  // ===== NEW COMPREHENSIVE ANALYTICS METHODS =====

  async getDashboardStats(): Promise<DashboardStats> {
    const totalAmbassadors = await this.userRepo.count({ where: { role: 'ambassador' } });
    const activeAmbassadors = await this.userRepo.count({ where: { role: 'ambassador', active: true } });
    const totalTeams = await this.teamRepo.count();
    
    const now = new Date();
    const weekStart = startOfWeek(now);
    const lastWeekStart = startOfWeek(subDays(now, 7));
    const lastWeekEnd = endOfWeek(subDays(now, 7));
    
    const thisWeekActivity = await this.activityRepo.count({
      where: {
        timestamp: MoreThanOrEqual(weekStart)
      }
    });
    
    const lastWeekActivity = await this.activityRepo.count({
      where: {
        timestamp: Between(lastWeekStart, lastWeekEnd)
      }
    });
    
    const activeWarnings = await this.warningRepo.count({ where: { active: true } });
    
    const compliantUsers = await this.getOverallComplianceRate();
    const overallComplianceRate = totalAmbassadors > 0 ? (compliantUsers / totalAmbassadors) * 100 : 0;
    
    return {
      totalAmbassadors,
      activeAmbassadors,
      totalTeams,
      overallComplianceRate,
      thisWeekActivity,
      lastWeekActivity,
      activeWarnings
    };
  }

  async getActivityTrends(days: number = 30): Promise<ActivityTrend[]> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const activities = await this.activityRepo
      .createQueryBuilder('a')
      .select('DATE(a.timestamp)', 'date')
      .addSelect('a.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .where('a.timestamp >= :start', { start: startDate })
      .andWhere('a.timestamp <= :end', { end: endDate })
      .groupBy('DATE(a.timestamp)')
      .addGroupBy('a.mediaType')
      .orderBy('DATE(a.timestamp)', 'ASC')
      .getRawMany();
    
    const trendsMap: Record<string, ActivityTrend> = {};
    
    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = format(subDays(endDate, i), 'yyyy-MM-dd');
      trendsMap[date] = {
        date,
        stories: 0,
        posts: 0,
        reels: 0,
        total: 0
      };
    }
    
    // Fill with actual data
    activities.forEach(activity => {
      const date = activity.date;
      const count = parseInt(activity.count);
      const mediaType = activity.mediaType.toLowerCase();
      
      if (trendsMap[date]) {
        if (mediaType === 'story') trendsMap[date].stories += count;
        else if (mediaType === 'image') trendsMap[date].posts += count;
        else if (mediaType === 'video') trendsMap[date].reels += count;
        trendsMap[date].total += count;
      }
    });
    
    return Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTeamPerformance(): Promise<TeamPerformance[]> {
    const teams = await this.teamRepo.find({
      relations: ['leader', 'members', 'members.user']
    });
    
    const globalRule = await this.rulesRepo.findOne({ where: {} });
    const expectedStories = globalRule?.stories_per_week ?? 3;
    const expectedPosts = globalRule?.posts_per_week ?? 1;
    const expectedReels = globalRule?.reels_per_week ?? 1;
    
    const weekStart = startOfWeek(new Date());
    
    const performance: TeamPerformance[] = [];
    
    for (const team of teams) {
      const memberIds = team.members.map(m => m.user.id);
      const instagramIds = team.members.map(m => m.user.instagram).filter(Boolean);
      
      let totalActivity = 0;
      let stories = 0;
      let posts = 0;
      let reels = 0;
      let compliantMembers = 0;
      
      if (instagramIds.length > 0) {
        const activities = await this.activityRepo
          .createQueryBuilder('a')
          .select('a.mediaType', 'mediaType')
          .addSelect('COUNT(*)', 'count')
          .where('a.userInstagramId IN (:...instagramIds)', { instagramIds })
          .andWhere('a.timestamp >= :weekStart', { weekStart })
          .groupBy('a.mediaType')
          .getRawMany();
        
        const activityMap = { story: 0, image: 0, video: 0 };
        activities.forEach(a => {
          const count = parseInt(a.count);
          activityMap[a.mediaType.toLowerCase() as keyof typeof activityMap] = count;
        });
        
        stories = activityMap.story;
        posts = activityMap.image;
        reels = activityMap.video;
        totalActivity = stories + posts + reels;
        
        // Calculate compliance for each member
        for (const member of team.members) {
          const memberActivities = await this.activityRepo
            .createQueryBuilder('a')
            .select('a.mediaType', 'mediaType')
            .addSelect('COUNT(*)', 'count')
            .where('a.userInstagramId = :instagramId', { instagramId: member.user.instagram })
            .andWhere('a.timestamp >= :weekStart', { weekStart })
            .groupBy('a.mediaType')
            .getRawMany();
          
          const memberActivityMap = { story: 0, image: 0, video: 0 };
          memberActivities.forEach(a => {
            memberActivityMap[a.mediaType.toLowerCase() as keyof typeof memberActivityMap] = parseInt(a.count);
          });
          
          const isCompliant = memberActivityMap.story >= expectedStories &&
                             memberActivityMap.image >= expectedPosts &&
                             memberActivityMap.video >= expectedReels;
          
          if (isCompliant) compliantMembers++;
        }
      }
      
      const memberCount = team.members.length;
      const complianceRate = memberCount > 0 ? (compliantMembers / memberCount) * 100 : 0;
      const avgActivityPerMember = memberCount > 0 ? totalActivity / memberCount : 0;
      
      performance.push({
        teamId: team.id,
        teamName: team.name,
        memberCount,
        complianceRate,
        totalActivity,
        avgActivityPerMember,
        stories,
        posts,
        reels
      });
    }
    
    return performance.sort((a, b) => b.complianceRate - a.complianceRate);
  }

  async getUserEngagement(): Promise<UserEngagement[]> {
    const users = await this.userRepo.find({
      where: { role: 'ambassador' },
      relations: ['teamMemberships', 'teamMemberships.team', 'warnings']
    });
    
    const globalRule = await this.rulesRepo.findOne({ where: {} });
    const expectedStories = globalRule?.stories_per_week ?? 3;
    const expectedPosts = globalRule?.posts_per_week ?? 1;
    const expectedReels = globalRule?.reels_per_week ?? 1;
    
    const weekStart = startOfWeek(new Date());
    const engagement: UserEngagement[] = [];
    
    for (const user of users) {
      const activities = await this.activityRepo
        .createQueryBuilder('a')
        .select('a.mediaType', 'mediaType')
        .addSelect('COUNT(*)', 'count')
        .where('a.userInstagramId = :instagramId', { instagramId: user.instagram })
        .andWhere('a.timestamp >= :weekStart', { weekStart })
        .groupBy('a.mediaType')
        .getRawMany();
      
      const lastActivity = await this.activityRepo
        .createQueryBuilder('a')
        .select('MAX(a.timestamp)', 'lastActivity')
        .where('a.userInstagramId = :instagramId', { instagramId: user.instagram })
        .getRawOne();
      
      const activityMap = { story: 0, image: 0, video: 0 };
      activities.forEach(a => {
        activityMap[a.mediaType.toLowerCase() as keyof typeof activityMap] = parseInt(a.count);
      });
      
      const stories = activityMap.story;
      const posts = activityMap.image;
      const reels = activityMap.video;
      const totalActivity = stories + posts + reels;
      
      // Calculate compliance score (0-100)
      const storyCompliance = Math.min(stories / expectedStories, 1);
      const postCompliance = Math.min(posts / expectedPosts, 1);
      const reelCompliance = Math.min(reels / expectedReels, 1);
      const complianceScore = ((storyCompliance + postCompliance + reelCompliance) / 3) * 100;
      
      const teamName = user.teamMemberships?.[0]?.team?.name;
      const warningCount = user.warnings?.filter(w => w.active)?.length || 0;
      
      engagement.push({
        userId: user.id,
        userName: user.name,
        teamName,
        totalActivity,
        stories,
        posts,
        reels,
        complianceScore,
        lastActivity: lastActivity?.lastActivity,
        warningCount,
        isActive: user.active
      });
    }
    
    return engagement.sort((a, b) => b.complianceScore - a.complianceScore);
  }

  async getComplianceTrends(months: number = 6): Promise<ComplianceTrend[]> {
    const trends: ComplianceTrend[] = [];
    const globalRule = await this.rulesRepo.findOne({ where: {} });
    const expectedStories = globalRule?.stories_per_week ?? 3;
    const expectedPosts = globalRule?.posts_per_week ?? 1;
    const expectedReels = globalRule?.reels_per_week ?? 1;
    
    for (let i = 0; i < months; i++) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const users = await this.userRepo.find({ where: { role: 'ambassador' } });
      let compliantUsers = 0;
      
      for (const user of users) {
        const activities = await this.activityRepo
          .createQueryBuilder('a')
          .select('a.mediaType', 'mediaType')
          .addSelect('COUNT(*)', 'count')
          .where('a.userInstagramId = :instagramId', { instagramId: user.instagram })
          .andWhere('a.timestamp >= :start', { start: monthStart })
          .andWhere('a.timestamp <= :end', { end: monthEnd })
          .groupBy('a.mediaType')
          .getRawMany();
        
        const activityMap = { story: 0, image: 0, video: 0 };
        activities.forEach(a => {
          activityMap[a.mediaType.toLowerCase() as keyof typeof activityMap] = parseInt(a.count);
        });
        
        // Adjust for weekly requirements in monthly data
        const weeksInMonth = 4;
        const isCompliant = activityMap.story >= (expectedStories * weeksInMonth) &&
                           activityMap.image >= (expectedPosts * weeksInMonth) &&
                           activityMap.video >= (expectedReels * weeksInMonth);
        
        if (isCompliant) compliantUsers++;
      }
      
      const totalUsers = users.length;
      const complianceRate = totalUsers > 0 ? (compliantUsers / totalUsers) * 100 : 0;
      
      trends.unshift({
        period: format(date, 'yyyy-MM'),
        compliantUsers,
        totalUsers,
        complianceRate
      });
    }
    
    return trends;
  }

  async getActivityDistribution(): Promise<ActivityDistribution[]> {
    const activities = await this.activityRepo
      .createQueryBuilder('a')
      .select('a.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.mediaType')
      .getRawMany();
    
    const total = activities.reduce((sum, a) => sum + parseInt(a.count), 0);
    
    return activities.map(a => {
      const count = parseInt(a.count);
      return {
        mediaType: a.mediaType,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      };
    });
  }

  async getTopPerformers(limit: number = 10): Promise<TopPerformers[]> {
    const engagement = await this.getUserEngagement();
    return engagement.slice(0, limit).map(e => ({
      userId: e.userId,
      userName: e.userName,
      teamName: e.teamName,
      totalActivity: e.totalActivity,
      complianceScore: e.complianceScore
    }));
  }

  async getInactiveUsers(daysSinceLastActivity: number = 7): Promise<InactiveUsers[]> {
    const cutoffDate = subDays(new Date(), daysSinceLastActivity);
    
    const users = await this.userRepo.find({
      where: { role: 'ambassador', active: true },
      relations: ['teamMemberships', 'teamMemberships.team', 'warnings']
    });
    
    const inactiveUsers: InactiveUsers[] = [];
    
    for (const user of users) {
      const lastActivity = await this.activityRepo
        .createQueryBuilder('a')
        .select('MAX(a.timestamp)', 'lastActivity')
        .where('a.userInstagramId = :instagramId', { instagramId: user.instagram })
        .getRawOne();
      
      const lastActivityDate = lastActivity?.lastActivity;
      const daysSince = lastActivityDate ? 
        Math.floor((new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)) : 
        999;
      
      if (!lastActivityDate || new Date(lastActivityDate) < cutoffDate) {
        const teamName = user.teamMemberships?.[0]?.team?.name;
        const warningCount = user.warnings?.filter(w => w.active)?.length || 0;
        
        inactiveUsers.push({
          userId: user.id,
          userName: user.name,
          teamName,
          lastActivity: lastActivityDate,
          daysSinceLastActivity: daysSince,
          warningCount
        });
      }
    }
    
    return inactiveUsers.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);
  }

  // ===== END NEW METHODS =====

  async getTeamComplianceTrend(leaderId: string) {
    const team = await this.teamRepo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('team.leaderId = :leaderId', { leaderId })
      .getOne();

    if (!team) return [];

    const globalRule = await this.rulesRepo.findOne({ where: {} });
    const instagramIds = team.members.map(m => m.user.instagram);
    if (instagramIds.length === 0) return [];

    const raw = await this.activityRepo
      .createQueryBuilder('activity')
      .select("TO_CHAR(activity.timestamp, 'YYYY-MM')", 'month')
      .addSelect('activity.userInstagramId', 'userInstagramId')
      .addSelect('activity.mediaType', 'mediaType')
      .addSelect('COUNT(*)', 'count')
      .where('activity.userInstagramId IN (:...instagramIds)', { instagramIds })
      .groupBy("TO_CHAR(activity.timestamp, 'YYYY-MM')")
      .addGroupBy('activity.userInstagramId')
      .addGroupBy('activity.mediaType')
      .orderBy("TO_CHAR(activity.timestamp, 'YYYY-MM')")
      .getRawMany();

    const complianceMap: Record<string, Record<string, number>> = {};

    for (const row of raw) {
      const month = row.month;
      const uid = row.userInstagramId;
      const media = row.mediaType.toUpperCase();
      const count = parseInt(row.count, 10);

      if (!complianceMap[month]) complianceMap[month] = {};
      if (!complianceMap[month][uid]) complianceMap[month][uid] = 0;

      const rules = {
        STORY: globalRule?.stories_per_week ?? 3,
        IMAGE: globalRule?.posts_per_week ?? 1,
        VIDEO: globalRule?.reels_per_week ?? 1,
      };

      const meets = (media === 'STORY' && count >= rules.STORY)
        || (media === 'IMAGE' && count >= rules.IMAGE)
        || (media === 'VIDEO' && count >= rules.VIDEO);

      if (meets) {
        complianceMap[month][uid]++;
      }
    }

    return Object.entries(complianceMap).map(([month, userMap]) => {
      const compliant = Object.values(userMap).filter(v => v >= 3).length;
      return { month, compliant };
    });
  }
}
