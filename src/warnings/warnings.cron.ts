// src/warnings/warnings.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WarningsService } from './warnings.service';

@Injectable()
export class WarningsCron {
  constructor(private readonly warnings: WarningsService) {}

  // Run daily at 09:00
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async daily() {
    await this.warnings.evaluateAndSend();
  }
}
