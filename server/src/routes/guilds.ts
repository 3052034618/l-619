import { Router, Response } from 'express';
import { GuildService } from '../services/GuildService';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const guildService = GuildService.getInstance();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20, sortBy = 'level' } = req.query;
  const result = await guildService.listGuilds(Number(page), Number(pageSize), sortBy as string);
  res.status(result.success ? 200 : 500).json(result);
});

router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, description, tag } = req.body;
  const result = await guildService.createGuild(req.playerId!, name, description, tag);
  res.status(result.success ? 200 : 400).json(result);
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await guildService.getGuildInfo(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await guildService.joinGuild(req.playerId!, req.params.id);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await guildService.leaveGuild(req.playerId!);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/contribute', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { gold, materials } = req.body;
  const result = await guildService.contribute(req.playerId!, Number(gold), materials || {});
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/building/:id/upgrade', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await guildService.upgradeBuilding(req.playerId!, req.params.id);
  res.status(result.success ? 200 : 400).json(result);
});

export default router;
