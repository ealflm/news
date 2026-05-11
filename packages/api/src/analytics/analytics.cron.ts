import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsCron {
  private readonly log = new Logger(AnalyticsCron.name);

  constructor(private readonly analytics: AnalyticsService) {}

  // Run at 00:30 every day
  @Cron('30 0 * * *')
  async daily() {
    try {
      const result = await this.analytics.runDailyRollup();
      this.log.log(`Daily rollup complete: posts=${result.posts} popups=${result.popups}`);
    } catch (err) {
      this.log.error('Daily rollup failed', err as Error);
    }
  }
}
