import { Router, Request, Response } from 'express';
import { PlayerService } from '../services/PlayerService';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Fragment } from '../entities/Fragment';
import { Sandglass } from '../entities/Sandglass';
import { PlayerInventory } from '../entities/PlayerInventory';

const router = Router();
const playerService = PlayerService.getInstance();

router.post('/register', async (req: Request, res: Response) => {
  const { username, password, nickname } = req.body;
  const result = await playerService.register(username, password, nickname);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const result = await playerService.login(username, password);
  res.status(result.success ? 200 : 401).json(result);
});

router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await playerService.logout(req.playerId!);
  res.status(result.success ? 200 : 500).json(result);
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await playerService.getPlayer(req.playerId!);
  res.status(result.success ? 200 : 404).json(result);
});

router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await playerService.updatePlayer(req.playerId!, req.body);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/workshop-layout', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await playerService.saveWorkshopLayout(req.playerId!, req.body);
  res.status(result.success ? 200 : 400).json(result);
});

router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { q, page = 1, pageSize = 20 } = req.query;
  const result = await playerService.searchPlayers(q as string, Number(page), Number(pageSize));
  res.status(result.success ? 200 : 500).json(result);
});

router.get('/me/inventory', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const inventoryRepo = AppDataSource.getRepository(PlayerInventory);
    const fragmentRepo = AppDataSource.getRepository(Fragment);
    const sandglassRepo = AppDataSource.getRepository(Sandglass);

    const inventory = await inventoryRepo.findOne({ where: { playerId: req.playerId! } });
    if (!inventory) {
      res.status(404).json({ success: false, error: '背包不存在' });
      return;
    }

    const fragments = await fragmentRepo.find({
      where: { inventoryId: inventory.id },
      order: { quality: 'DESC', createdAt: 'DESC' },
    });

    const sandglasses = await sandglassRepo.find({
      where: { inventoryId: inventory.id },
      order: { rarity: 'DESC', createdAt: 'DESC' },
    });

    res.json({
      success: true,
      data: {
        inventory: {
          fragmentCapacity: inventory.fragmentCapacity,
          sandglassCapacity: inventory.sandglassCapacity,
        },
        fragments,
        sandglasses,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取背包失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await playerService.getPlayer(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

export default router;
