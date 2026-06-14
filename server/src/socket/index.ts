import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils';
import { DungeonManager } from '../services/DungeonManager';
import { LeagueManager } from '../services/LeagueManager';
import { TradeManager } from '../services/TradeManager';
import { logger } from '../utils/logger';
import { PlayerStatus } from '../entities/Player';
import { AppDataSource } from '../config/database';
import { Player } from '../entities/Player';

interface AuthSocket extends Socket {
  playerId?: string;
}

export function setupSocketHandlers(io: Server): void {
  const dungeonManager = DungeonManager.getInstance();
  const leagueManager = LeagueManager.getInstance();
  const tradeManager = TradeManager.getInstance();

  dungeonManager.setSocketServer(io);
  leagueManager.setSocketServer(io);
  tradeManager.setSocketServer(io);

  io.use(async (socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        socket.playerId = decoded.playerId;
        socket.join(`player:${decoded.playerId}`);
      }
    }
    next();
  });

  io.on('connection', (socket: AuthSocket) => {
    logger.debug(`Socket connected: ${socket.id} (player: ${socket.playerId || 'anonymous'})`);

    if (socket.playerId) {
      const playerRepo = AppDataSource.getRepository(Player);
      playerRepo.update(socket.playerId, { status: PlayerStatus.ONLINE }).catch(() => {});
    }

    socket.on('dungeon:join', async ({ sessionId }) => {
      if (!socket.playerId || !sessionId) return;
      socket.join(`dungeon:${sessionId}`);
      logger.debug(`Player ${socket.playerId} joined dungeon ${sessionId}`);
    });

    socket.on('dungeon:leave', async ({ sessionId }) => {
      if (!sessionId) return;
      socket.leave(`dungeon:${sessionId}`);
    });

    socket.on('dungeon:position', async ({ sessionId, x, y, z, hp }) => {
      if (!socket.playerId || !sessionId) return;
      await dungeonManager.updatePlayerPosition(sessionId, socket.playerId, x, y, z, hp);
    });

    socket.on('match:join', async ({ matchId }) => {
      if (!matchId) return;
      socket.join(`match:${matchId}`);
      logger.debug(`Player ${socket.playerId} joined match ${matchId}`);
    });

    socket.on('match:leave', async ({ matchId }) => {
      if (!matchId) return;
      socket.leave(`match:${matchId}`);
    });

    socket.on('chat:message', async ({ room, message }) => {
      if (!socket.playerId || !room || !message) return;
      io.to(room).emit('chat:message', {
        playerId: socket.playerId,
        message,
        timestamp: Date.now(),
      });
    });

    socket.on('presence:update', async ({ status }) => {
      if (!socket.playerId) return;
      const playerRepo = AppDataSource.getRepository(Player);
      await playerRepo.update(socket.playerId, { status }).catch(() => {});
    });

    socket.on('disconnect', async () => {
      logger.debug(`Socket disconnected: ${socket.id} (player: ${socket.playerId || 'anonymous'})`);
      if (socket.playerId) {
        const playerRepo = AppDataSource.getRepository(Player);
        await playerRepo.update(socket.playerId, { status: PlayerStatus.OFFLINE }).catch(() => {});
      }
    });
  });

  logger.info('Socket handlers initialized');
}
