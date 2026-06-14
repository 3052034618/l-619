import { Router, Response } from 'express';
import { CraftingService } from '../services/CraftingService';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const craftingService = CraftingService.getInstance();

router.post('/craft', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { recipe } = req.body;
  const result = await craftingService.craftSandglass(req.playerId!, recipe);
  res.status(result.success ? 200 : 400).json(result);
});

router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;
  const history = await craftingService.getCraftHistory(req.playerId!, Number(page), Number(pageSize));
  res.json({ success: true, data: history });
});

router.get('/stats', async (req: AuthRequest, res: Response) => {
  const stats = await craftingService.getCraftStats();
  res.json({ success: true, data: stats });
});

export default router;
