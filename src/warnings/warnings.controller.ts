// src/warnings/warnings.controller.ts
import { Controller, Post, Param, Body, Get, Patch, Query } from '@nestjs/common';
import { WarningsService } from './warnings.service';

@Controller('warnings')
export class WarningsController {
  constructor(private warnings: WarningsService) {}

  @Post('evaluate-now')
  manualRun() {
    return this.warnings.evaluateAndSend();
  }

  @Patch(':userId/clear')
  clear(@Param('userId') userId: string) {
    return this.warnings.clearUserWarnings(userId);
  }

  @Patch(':userId/pause')
  pause(@Param('userId') userId: string, @Body() body: { until?: string }) {
    const until = body.until ? new Date(body.until) : null;
    return this.warnings.pauseUserWarnings(userId, until);
  }
}
