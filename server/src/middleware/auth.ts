import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils';
import { config } from '../config';
import { PlayerService } from '../services/PlayerService';
import { Player } from '../entities/Player';

export interface AuthRequest extends Request {
  player?: Player;
  playerId?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: '未提供认证令牌', code: 'NO_TOKEN' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ success: false, error: '令牌无效或已过期', code: 'INVALID_TOKEN' });
      return;
    }

    req.playerId = decoded.playerId;
    const playerService = PlayerService.getInstance();
    const result = await playerService.getPlayer(decoded.playerId);
    if (result.success && result.data) {
      req.player = result.data;
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: '认证错误', code: 'AUTH_ERROR' });
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        req.playerId = decoded.playerId;
      }
    }
    next();
  } catch {
    next();
  }
}
