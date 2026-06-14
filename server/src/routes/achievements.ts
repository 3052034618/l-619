import { Router, Response } from 'express';
import { AchievementService } from '../services/AchievementService';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const achievementService = AchievementService.getInstance();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await achievementService.getPlayerAchievements(req.playerId!);
  res.status(result.success ? 200 : 500).json(result);
});

router.post('/:id/claim', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await achievementService.claimReward(req.playerId!, req.params.id);
  res.status(result.success ? 200 : 400).json(result);
});

export default router;
