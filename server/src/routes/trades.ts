import { Router, Response } from 'express';
import { TradeManager } from '../services/TradeManager';
import { TradeItemType } from '../entities/Trade';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const tradeManager = TradeManager.getInstance();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { itemType, quality, era, sortBy = 'createdAt', sortOrder = 'DESC', page = 1, pageSize = 20, minPrice, maxPrice } = req.query;
  const result = await tradeManager.listTrades(
    itemType as TradeItemType,
    quality as string,
    era as string,
    sortBy as string,
    sortOrder as any,
    Number(page),
    Number(pageSize),
    minPrice ? Number(minPrice) : undefined,
    maxPrice ? Number(maxPrice) : undefined
  );
  res.status(result.success ? 200 : 500).json(result);
});

router.post('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { itemType, itemId, price } = req.body;
  const result = await tradeManager.listItem(req.playerId!, itemType as TradeItemType, itemId, Number(price));
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await tradeManager.cancelListing(req.playerId!, req.params.id);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/:id/buy', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await tradeManager.buyItem(req.playerId!, req.params.id);
  res.status(result.success ? 200 : 400).json(result);
});

router.get('/suggested-price', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { itemType, quality, era } = req.query;
  const price = await tradeManager.getSuggestedPrice(itemType as TradeItemType, quality as string, era as string);
  res.json({ success: true, data: { suggestedPrice: price } });
});

router.get('/price-trend', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { itemType, quality, era, days = 7 } = req.query;
  const result = await tradeManager.getPriceTrend(
    itemType as TradeItemType,
    quality as string,
    era as string,
    Number(days)
  );
  res.status(result.success ? 200 : 500).json(result);
});

export default router;
