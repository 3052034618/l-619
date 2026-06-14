import { Router, Response } from 'express';
import { DungeonManager } from '../services/DungeonManager';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const dungeonManager = DungeonManager.getInstance();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;
  const result = await dungeonManager.listDungeons(Number(page), Number(pageSize));
  res.status(result.success ? 200 : 500).json(result);
});

router.post('/session', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { dungeonId, playerIds = [] } = req.body;
  const result = await dungeonManager.createSession(req.playerId!, dungeonId, playerIds);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/session/:id/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await dungeonManager.startSession(req.params.id, req.playerId!);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/session/:id/abandon', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await dungeonManager.abandonSession(req.params.id, req.playerId!);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/session/:id/fragment', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await dungeonManager.collectFragment(req.params.id, req.playerId!);
  res.status(result.success ? 200 : 400).json(result);
});

router.get('/session/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const state = dungeonManager.getSessionState(req.params.id);
  if (!state) {
    res.status(404).json({ success: false, error: '副本会话不存在' });
    return;
  }
  res.json({ success: true, data: state });
});

export default router;
