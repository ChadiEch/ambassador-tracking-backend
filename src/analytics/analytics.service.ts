import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common/exceptions/internal-server-error.exception';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';
import { PostingRule } from '../posting-rules/entities/posting-rule.entity';
import type { AmbassadorSummary } from './dto/ambassador-summary.dto';
import { AmbassadorComplianceData } from './dto/ambassador-compliance.dto';
import { Team } from 'src/teams/entities/team.entity';
type TeamContribution = {
  teamId: string;
  [mediaType: string]: number | string;
};

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

  // Example: compliance per team
 async getCompliancePerTeam() {
  try {
    const result = await this.activityRepo
      .createQueryBuilder('activity')
      .select('activity.teamId', 'teamId')
      .addSelect('COUNT(*)', 'totalActivities')
      .addSelect(
        'SUM(CASE WHEN activity.compliant = true THEN 1 ELSE 0 END)',
        'compliantActivities',
      )
      .groupBy('activity.teamId')
      .getRawMany();

    return result;
  } catch (error) {
    console.error('Error in getCompliancePerTeam:', error);
    throw new InternalServerErrorException('Failed to get compliance per team');
  }
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
