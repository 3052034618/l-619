import { Express } from 'express';
import playerRoutes from './players';
import craftingRoutes from './crafting';
import dungeonRoutes from './dungeons';
import leagueRoutes from './league';
import tradeRoutes from './trades';
import guildRoutes from './guilds';
import achievementRoutes from './achievements';
import reportRoutes from './reports';

export function setupRoutes(app: Express): void {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.use('/api/players', playerRoutes);
  app.use('/api/crafting', craftingRoutes);
  app.use('/api/dungeons', dungeonRoutes);
  app.use('/api/league', leagueRoutes);
  app.use('/api/trades', tradeRoutes);
  app.use('/api/guilds', guildRoutes);
  app.use('/api/achievements', achievementRoutes);
  app.use('/api/reports', reportRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: '路由不存在', code: 'NOT_FOUND' });
  });

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: '服务器内部错误', code: 'INTERNAL_ERROR' });
  });
}
