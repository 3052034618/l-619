import { Router, Response } from 'express';
import { LeagueManager } from '../services/LeagueManager';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const leagueManager = LeagueManager.getInstance();

router.post('/queue/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { sandglassId } = req.body;
  const result = await leagueManager.joinQueue(req.playerId!, sandglassId);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/queue/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await leagueManager.leaveQueue(req.playerId!);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/match/:id/skill', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { skillId, targetId } = req.body;
  const result = await leagueManager.activateSkill(req.params.id, req.playerId!, skillId, targetId);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/match/:id/counter', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await leagueManager.counterSkill(req.params.id, req.playerId!);
  res.status(result.success ? 200 : 400).json(result);
});

router.get('/match/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const state = leagueManager.getActiveMatchState(req.params.id);
  if (!state) {
    res.status(404).json({ success: false, error: '比赛不存在' });
    return;
  }
  res.json({ success: true, data: state });
});

router.get('/leaderboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { season, page = 1, pageSize = 20 } = req.query;
  const result = await leagueManager.getLeaderboard(
    season ? Number(season) : undefined,
    Number(page),
    Number(pageSize)
  );
  res.status(result.success ? 200 : 500).json(result);
});

router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;
  const result = await leagueManager.getMatchHistory(req.playerId!, Number(page), Number(pageSize));
  res.status(result.success ? 200 : 500).json(result);
});

export default router;
