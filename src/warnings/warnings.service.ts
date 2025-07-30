// src/warnings/warnings.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Warning } from './entities/warning.entity';
import { User } from 'src/users/entities/user.entity';
import { AmbassadorActivity } from 'src/entities/ambassador-activity.entity';
import { addDays, subDays, isAfter } from 'date-fns';
import { MailerService } from 'src/mailer/mailer.service';
import { WarningConfig } from './entities/warning-config.entity';

@Injectable()
export class WarningsService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Warning) private warningsRepo: Repository<Warning>,
    @InjectRepository(AmbassadorActivity) private actRepo: Repository<AmbassadorActivity>,
    @InjectRepository(WarningConfig) private cfgRepo: Repository<WarningConfig>,
  ) {}

  private async getConfig(): Promise<WarningConfig> {
    const cfg = await this.cfgRepo.findOne({});
    // fallback defaults if none found
    return cfg ?? Object.assign(new WarningConfig(), {});
  }

  private async hasActivityInRange(userId: string, start: Date, end: Date) {
    const cnt = await this.actRepo.count({
      where: { user: { id: userId }, createdAt: Between(start, end) },
    });
    return cnt > 0;
  }

  private async isNonCompliantSince(userId: string, start: Date, end: Date, cfg: WarningConfig) {
    // Simple check: compare total counts in [start,end] to expected per week * weeks
    // You can refine per type & your rules logic.
    const acts = await this.actRepo
      .createQueryBuilder('a')
      .where('a."userId" = :userId', { userId })
      .andWhere('a."createdAt" BETWEEN :start AND :end', { start, end })
      .getMany();

    const weeks = Math.max(1, Math.ceil((+end - +start) / (7 * 24 * 3600 * 1000)));
    const expected = {
      stories: cfg.expectedStoriesPerWeek * weeks,
      posts:   cfg.expectedPostsPerWeek   * weeks,
      reels:   cfg.expectedReelsPerWeek   * weeks,
    };

    const totals = acts.reduce((acc, a) => {
      acc[a.mediaType] = (acc[a.mediaType] || 0) + 1; // assume a.type in {'story','post','reel'}
      return acc;
    }, {} as Record<'story'|'post'|'reel', number>);

    const okStories = (totals.story || 0) >= expected.stories;
    const okPosts   = (totals.post  || 0) >= expected.posts;
    const okReels   = (totals.reel  || 0) >= expected.reels;

    const compliantCount = [okStories, okPosts, okReels].filter(Boolean).length;
    // Non-compliant if not meeting all expectations:
    return compliantCount < 3;
  }

  async evaluateAndSend(now = new Date()) {
    const cfg = await this.getConfig();
    const windowStart = subDays(now, cfg.inactivityWindowDays);

    const users = await this.usersRepo.find({
      where: { active: true, role: 'ambassador' as any },
      relations: ['warnings'],
    });

    for (const user of users) {
      if (user.warningPausedUntil && isAfter(user.warningPausedUntil, now)) continue;

      const userWarnings = (user.warnings || []).sort((a, b) => a.level - b.level);
      const level1 = userWarnings.find(w => w.level === 1 && w.active);
      const level2 = userWarnings.find(w => w.level === 2 && w.active);
      const level3 = userWarnings.find(w => w.level === 3 && w.active);

      // If already at level 3, we only ensure admin notified & skip.
      if (level3) continue;

      const hasAnyActivity = await this.hasActivityInRange(user.id, windowStart, now);

      // 1) First warning
      if (!level1 && !hasAnyActivity) {
        await this.issueWarning(user, 1, 'inactivity', windowStart, now, cfg);
        continue;
      }

      // 2) Second warning (after grace) if still no activity
      if (level1 && !level2) {
        const secondDue = addDays(level1.sentAt, cfg.secondGraceDays);
        if (isAfter(now, secondDue)) {
          const stillNoActivity = !await this.hasActivityInRange(user.id, level1.windowStart, now);
          if (stillNoActivity) {
            await this.issueWarning(user, 2, 'inactivity', level1.windowStart, now, cfg);
            continue;
          }
        }
      }

      // 3) Third warning (two paths)
      if (level2 && !level3) {
        const thirdDue = addDays(level2.sentAt, cfg.thirdGraceDays);
        const nonComplDue = addDays(level2.sentAt, cfg.noncomplianceGraceDays);
        if (isAfter(now, thirdDue)) {
          const stillNoActivity = !await this.hasActivityInRange(user.id, level1?.windowStart || windowStart, now);
          if (stillNoActivity) {
            await this.issueWarning(user, 3, 'inactivity', level1?.windowStart || windowStart, now, cfg);
            await this.escalateToAdmins(user);
            continue;
          }
        }
        if (isAfter(now, nonComplDue)) {
          const hasPosted = await this.hasActivityInRange(user.id, level2.sentAt, now);
          if (hasPosted) {
            const nonCompl = await this.isNonCompliantSince(user.id, level2.sentAt, now, cfg);
            if (nonCompl) {
              await this.issueWarning(user, 3, 'non_compliance', level2.sentAt, now, cfg);
              await this.escalateToAdmins(user);
              continue;
            }
          }
        }
      }
    }
  }

  private async issueWarning(
    user: User,
    level: 1|2|3,
    reason: 'inactivity'|'non_compliance',
    windowStart: Date,
    windowEnd: Date,
    cfg: WarningConfig
  ) {
    const w = this.warningsRepo.create({ user, level, reason, windowStart, windowEnd });
    await this.warningsRepo.save(w);

    // Send email to ambassador:
    const tpl = level === 1 ? cfg.emailTemplateLevel1
             : level === 2 ? cfg.emailTemplateLevel2
             : cfg.emailTemplateLevel3;
    await MailerService.sendToAmbassador(user, tpl, { level, reason, windowStart, windowEnd });

    if (level === 3) {
      await this.usersRepo.update(user.id, { warningEscalated: true });
    }
  }

  private async escalateToAdmins(user: User) {
    await MailerService.notifyAdmins(
      `Ambassador ${user.name} (${user.username}) reached 3 warnings. Recommended removal.`
    );
  }

  async clearUserWarnings(userId: string) {
    await this.warningsRepo.update({ user: { id: userId }, active: true }, { active: false });
    await this.usersRepo.update(userId, { warningEscalated: false });
  }

async pauseUserWarnings(userId: string, until: Date | null) {
  await this.usersRepo.update(userId, { warningPausedUntil: until || undefined });
}


}
