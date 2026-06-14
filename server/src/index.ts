import 'reflect-metadata';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Server } from 'socket.io';
import { AppDataSource } from './config/database';
import { redisClient } from './config/redis';
import { logger } from './utils/logger';
import { setupSocketHandlers } from './socket';
import { setupRoutes } from './routes';
import { config } from './config';
import { EventScheduler } from './services/EventScheduler';
import { LeagueManager } from './services/LeagueManager';
import { DungeonManager } from './services/DungeonManager';
import { TradeManager } from './services/TradeManager';
import { ReportGenerator } from './services/ReportGenerator';

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const io = new Server(server, {
  cors: { origin: config.corsOrigin, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

async function startServer() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected successfully');

    await redisClient.connect();
    logger.info('Redis connected successfully');

    setupRoutes(app);
    setupSocketHandlers(io);

    const eventScheduler = EventScheduler.getInstance();
    eventScheduler.start();

    LeagueManager.getInstance().start();
    DungeonManager.getInstance().start();
    TradeManager.getInstance().start();
    ReportGenerator.getInstance().start();

    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await AppDataSource.destroy();
  await redisClient.quit();
  process.exit(0);
});
