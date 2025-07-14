import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';
import { PostingRule } from '../posting-rules/entities/posting-rule.entity';
import type { AmbassadorSummary } from './dto/ambassador-summary.dto';
import { AmbassadorComplianceData } from './dto/ambassador-compliance.dto';
import { Team } from 'src/teams/entities/team.entity';

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

      results.push({
        id: user.id,
        name: user.name,
        photoUrl: user.photoUrl,
        role: user.role,
        active: user.active,
        edits: [], // ✅ Required field provided
        actual: {
          stories: countMap['STORY'],
          posts: countMap['IMAGE'],
          reels: countMap['VIDEO'],
        },
        expected: {
          stories: globalRule?.stories_per_week ?? 3,
          posts: globalRule?.posts_per_week ?? 1,
          reels: globalRule?.reels_per_week ?? 1,
        },
        compliance: {
          story: countMap['STORY'] >= (globalRule?.stories_per_week ?? 3) ? 'green' : 'red',
          post: countMap['IMAGE'] >= (globalRule?.posts_per_week ?? 1) ? 'green' : 'red',
          reel: countMap['VIDEO'] >= (globalRule?.reels_per_week ?? 1) ? 'green' : 'red',
        },
      });
    }

    return results;
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
        stories: countMap['STORY'],
        posts: countMap['IMAGE'],
        reels: countMap['VIDEO'],
      },
      expected: {
        stories: globalRule?.stories_per_week ?? 3,
        posts: globalRule?.posts_per_week ?? 1,
        reels: globalRule?.reels_per_week ?? 1,
      },
      compliance: {
        story: countMap['STORY'] >= (globalRule?.stories_per_week ?? 3) ? 'green' : 'red',
        post: countMap['IMAGE'] >= (globalRule?.posts_per_week ?? 1) ? 'green' : 'red',
        reel: countMap['VIDEO'] >= (globalRule?.reels_per_week ?? 1) ? 'green' : 'red',
      },
    };
  }

  async getTeamCompliance(
    leaderId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AmbassadorSummary[]> {
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
        edits: [], // ✅ Required field provided
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
}
