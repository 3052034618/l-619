import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { DungeonManager } from './DungeonManager';

export class EventScheduler {
  private static instance: EventScheduler;
  private scheduledEvents: Map<string, NodeJS.Timeout> = new Map();
  private hourlyTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): EventScheduler {
    if (!EventScheduler.instance) {
      EventScheduler.instance = new EventScheduler();
    }
    return EventScheduler.instance;
  }

  start(): void {
    this.hourlyTimer = setInterval(() => this.checkRippleEffect(), 60000);
    this.scheduleDailyReset();
    logger.info('EventScheduler started');
  }

  stop(): void {
    if (this.hourlyTimer) clearInterval(this.hourlyTimer);
    for (const timer of this.scheduledEvents.values()) {
      clearTimeout(timer);
    }
    this.scheduledEvents.clear();
  }

  private scheduleDailyReset(): void {
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setHours(0, 0, 0, 0);
    nextReset.setDate(nextReset.getDate() + 1);
    const delay = nextReset.getTime() - now.getTime();

    const timer = setTimeout(async () => {
      await this.runDailyReset();
      this.scheduleDailyReset();
    }, delay);

    this.scheduledEvents.set('daily_reset', timer);
  }

  private async runDailyReset(): Promise<void> {
    logger.info('Running daily reset...');
    try {
      await redisClient.set('dungeon:ripple_effect', JSON.stringify({ refreshMul: 1, rareMul: 1, expiresAt: Date.now() }), 'EX', 86400);
      DungeonManager.getInstance().setRippleEffect(1, 1);
      logger.info('Daily reset completed');
    } catch (error) {
      logger.error('Daily reset error:', error);
    }
  }

  private async checkRippleEffect(): Promise<void> {
    try {
      const effectData = await redisClient.get('dungeon:ripple_effect');
      if (effectData) {
        const parsed = JSON.parse(effectData);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          DungeonManager.getInstance().setRippleEffect(1, 1);
          await redisClient.del('dungeon:ripple_effect');
          logger.info('Time ripple effect expired');
        }
      }
    } catch (error) {
      logger.warn('Check ripple effect error:', error);
    }
  }
}
