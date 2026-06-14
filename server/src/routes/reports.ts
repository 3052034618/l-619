import { Router, Response } from 'express';
import { ReportGenerator } from '../services/ReportGenerator';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const reportGenerator = ReportGenerator.getInstance();

router.get('/weekly', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 10 } = req.query;
  const result = await reportGenerator.getReportHistory(Number(page), Number(pageSize));
  res.status(result.success ? 200 : 500).json(result);
});

router.get('/weekly/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await reportGenerator.getReportHistory(1, 1);
  res.json(result);
});

router.get('/weekly/:id/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await reportGenerator.exportReportPDF(req.params.id);
  if (!result.success || !result.data) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="weekly-report-${req.params.id}.pdf"`);
  res.send(result.data);
});

router.post('/weekly/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await reportGenerator.generateWeeklyReport();
  res.status(result.success ? 200 : 500).json(result);
});

router.get('/leaderboard/:type', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;
  const validTypes = ['collection', 'league', 'guild'];
  if (!validTypes.includes(req.params.type)) {
    res.status(400).json({ success: false, error: '无效的排行类型' });
    return;
  }
  const result = await reportGenerator.getGlobalLeaderboard(
    req.params.type as any,
    Number(page),
    Number(pageSize)
  );
  res.status(result.success ? 200 : 500).json(result);
});

router.get('/player/:id/workshop', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await reportGenerator.getPlayerWorkshop(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

router.get('/player/:id/adventures', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;
  const result = await reportGenerator.getPlayerAdventureRecords(
    req.params.id,
    Number(page),
    Number(pageSize)
  );
  res.status(result.success ? 200 : 500).json(result);
});

export default router;
