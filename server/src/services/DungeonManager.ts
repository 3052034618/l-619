import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Dungeon, DungeonEra, DungeonDifficulty } from '../entities/Dungeon';
import { DungeonSession, DungeonSessionStatus, PlayerPosition, CollectedFragment, DungeonEvent } from '../entities/DungeonSession';
import { Player, PlayerStatus } from '../entities/Player';
import { Fragment, FragmentQuality } from '../entities/Fragment';
import { PlayerInventory } from '../entities/PlayerInventory';
import { logger } from '../utils/logger';
import { generateId, randomInt, randomFloat, randomChoice, weightedRandomChoice } from '../utils';
import { ServiceResult } from '../types';
import { redisClient } from '../config/redis';
import { AchievementService } from './AchievementService';
import { GuildService } from './GuildService';
import { Server } from 'socket.io';

export interface DungeonRealTimeState {
  sessionId: string;
  playerPositions: PlayerPosition[];
  timeBalance: number;
  fragmentProgress: number;
  currentTimeFlowRate: number;
  events: DungeonEvent[];
  lastUpdate: number;
}

export class DungeonManager {
  private static instance: DungeonManager;
  private dungeonRepo: Repository<Dungeon>;
  private sessionRepo: Repository<DungeonSession>;
  private playerRepo: Repository<Player>;
  private fragmentRepo: Repository<Fragment>;
  private inventoryRepo: Repository<PlayerInventory>;
  private achievementService: AchievementService;
  private guildService: GuildService;
  private io: Server | null = null;
  private activeSessions: Map<string, DungeonRealTimeState> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;
  private refreshRateMultiplier: number = 1;
  private rareEventMultiplier: number = 1;

  private constructor() {
    this.dungeonRepo = AppDataSource.getRepository(Dungeon);
    this.sessionRepo = AppDataSource.getRepository(DungeonSession);
    this.playerRepo = AppDataSource.getRepository(Player);
    this.fragmentRepo = AppDataSource.getRepository(Fragment);
    this.inventoryRepo = AppDataSource.getRepository(PlayerInventory);
    this.achievementService = AchievementService.getInstance();
    this.guildService = GuildService.getInstance();
  }

  static getInstance(): DungeonManager {
    if (!DungeonManager.instance) {
      DungeonManager.instance = new DungeonManager();
    }
    return DungeonManager.instance;
  }

  setSocketServer(io: Server): void {
    this.io = io;
  }

  start(): void {
    this.tickInterval = setInterval(() => this.tick(), 1000);
    logger.info('DungeonManager started');
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
  }

  setRippleEffect(refreshMul: number, rareMul: number): void {
    this.refreshRateMultiplier = refreshMul;
    this.rareEventMultiplier = rareMul;
    logger.info(`Time ripple effect applied: refresh=${refreshMul}x, rare=${rareMul}x`);
  }

  async initDefaultDungeons(): Promise<void> {
    const dungeons: Array<Partial<Dungeon>> = [
      {
        name: '远古遗迹',
        description: '探索失落文明的时光废墟',
        era: DungeonEra.ANCIENT,
        difficulty: DungeonDifficulty.EASY,
        timeFlowRate: 100,
        maxTimeBalance: 600,
        requiredLevel: 1,
        rewards: { exp: 100, gold: 500, fragmentChance: 0.8, rareFragmentChance: 0.15, legendaryFragmentChance: 0.02 },
      },
      {
        name: '中世纪古堡',
        description: '穿越到骑士时代的幽暗城堡',
        era: DungeonEra.MEDIEVAL,
        difficulty: DungeonDifficulty.NORMAL,
        timeFlowRate: 80,
        maxTimeBalance: 480,
        requiredLevel: 10,
        rewards: { exp: 300, gold: 1500, fragmentChance: 0.9, rareFragmentChance: 0.25, legendaryFragmentChance: 0.05 },
      },
      {
        name: '文艺复兴学院',
        description: '达芬奇时代的神秘学院',
        era: DungeonEra.RENAISSANCE,
        difficulty: DungeonDifficulty.HARD,
        timeFlowRate: 150,
        maxTimeBalance: 420,
        requiredLevel: 25,
        rewards: { exp: 800, gold: 4000, fragmentChance: 0.95, rareFragmentChance: 0.4, legendaryFragmentChance: 0.1 },
      },
      {
        name: '近代机械城',
        description: '工业革命时期的蒸汽都市',
        era: DungeonEra.MODERN,
        difficulty: DungeonDifficulty.NIGHTMARE,
        timeFlowRate: 200,
        maxTimeBalance: 360,
        requiredLevel: 40,
        rewards: { exp: 2000, gold: 10000, fragmentChance: 1, rareFragmentChance: 0.55, legendaryFragmentChance: 0.18 },
      },
      {
        name: '未来都市',
        description: '赛博朋克风格的时空裂缝',
        era: DungeonEra.FUTURE,
        difficulty: DungeonDifficulty.HELL,
        timeFlowRate: 300,
        maxTimeBalance: 300,
        requiredLevel: 60,
        rewards: { exp: 5000, gold: 25000, fragmentChance: 1, rareFragmentChance: 0.7, legendaryFragmentChance: 0.3 },
      },
      {
        name: '神话起源',
        description: '时间诞生之处的原始混沌',
        era: DungeonEra.MYTHICAL,
        difficulty: DungeonDifficulty.HELL,
        timeFlowRate: 50,
        maxTimeBalance: 900,
        requiredLevel: 80,
        rewards: { exp: 15000, gold: 80000, fragmentChance: 1, rareFragmentChance: 0.9, legendaryFragmentChance: 0.5 },
      },
    ];

    for (const data of dungeons) {
      const exists = await this.dungeonRepo.findOne({ where: { name: data.name } });
      if (!exists) {
        const dungeon = this.dungeonRepo.create({
          ...data,
          id: generateId(),
          timeRifts: this.generateTimeRifts(data.era!),
          eventFragments: this.generateEventFragments(data.era!),
          guardians: this.generateGuardians(data.era!, data.difficulty!),
        });
        await this.dungeonRepo.save(dungeon);
      }
    }
  }

  private generateTimeRifts(era: string): any[] {
    const rifts = [];
    const count = randomInt(3, 7);
    for (let i = 0; i < count; i++) {
      rifts.push({
        x: randomFloat(-50, 50),
        y: randomFloat(-50, 50),
        z: randomFloat(-10, 10),
        era: randomChoice(['ancient', 'medieval', 'renaissance', 'modern', 'future', 'mythical']),
        active: Math.random() > 0.3,
      });
    }
    return rifts;
  }

  private generateEventFragments(era: string): any[] {
    const events = [
      { id: generateId(), name: '失落的日记', description: '记载着重要历史信息', rewards: { exp: 50, gold: 100 } },
      { id: generateId(), name: '古老的钥匙', description: '开启隐藏宝箱', rewards: { exp: 100, gold: 300 } },
      { id: generateId(), name: '时间碎片', description: '珍贵的时空遗物', rewards: { exp: 200, gold: 500 } },
    ];
    return events;
  }

  private generateGuardians(era: string, difficulty: string): any[] {
    const diffMul: Record<string, number> = { easy: 1, normal: 1.5, hard: 2.5, nightmare: 4, hell: 7 };
    const mul = diffMul[difficulty] || 1;
    return [
      {
        id: generateId(),
        name: '时光守卫',
        hp: Math.floor(1000 * mul),
        attack: Math.floor(50 * mul),
        abilities: ['时间减速', '时空冲击'],
      },
      {
        id: generateId(),
        name: '守时巨兽',
        hp: Math.floor(3000 * mul),
        attack: Math.floor(120 * mul),
        abilities: ['时间停滞', '回溯自愈'],
      },
    ];
  }

  async createSession(playerId: string, dungeonId: string, playerIds: string[] = []): Promise<ServiceResult<DungeonSession>> {
    try {
      const dungeon = await this.dungeonRepo.findOne({ where: { id: dungeonId } });
      if (!dungeon) {
        return { success: false, error: '副本不存在', code: 'DUNGEON_NOT_FOUND' };
      }

      const allPlayerIds = [playerId, ...playerIds.filter(id => id !== playerId)];

      if (allPlayerIds.length < dungeon.minPlayers || allPlayerIds.length > dungeon.maxPlayers) {
        return { success: false, error: `玩家数量需在 ${dungeon.minPlayers}-${dungeon.maxPlayers} 之间`, code: 'INVALID_PLAYER_COUNT' };
      }

      for (const pid of allPlayerIds) {
        const player = await this.playerRepo.findOne({ where: { id: pid } });
        if (!player) return { success: false, error: '玩家不存在', code: 'PLAYER_NOT_FOUND' };
        if (player.level < dungeon.requiredLevel) {
          return { success: false, error: `玩家 ${player.username} 等级不足，需要 ${dungeon.requiredLevel} 级`, code: 'LEVEL_TOO_LOW' };
        }
        if (player.status !== PlayerStatus.OFFLINE && player.status !== PlayerStatus.ONLINE) {
          return { success: false, error: `玩家 ${player.username} 正在忙碌中`, code: 'PLAYER_BUSY' };
        }
      }

      const session = this.sessionRepo.create({
        id: generateId(),
        dungeonId,
        playerIds: allPlayerIds,
        leaderId: playerId,
        status: DungeonSessionStatus.WAITING,
        timeBalance: dungeon.maxTimeBalance,
        currentTimeFlowRate: dungeon.timeFlowRate,
        playerPositions: allPlayerIds.map(pid => ({
          playerId: pid,
          x: 0, y: 0, z: 0,
          hp: 100, maxHp: 100,
          isAlive: true,
        })),
      });

      const saved = await this.sessionRepo.save(session);

      for (const pid of allPlayerIds) {
        await this.playerRepo.update(pid, { status: PlayerStatus.IN_DUNGEON });
      }

      this.registerSession(saved);

      return { success: true, data: saved };
    } catch (error) {
      logger.error('Create dungeon session error:', error);
      return { success: false, error: '创建副本失败', code: 'INTERNAL_ERROR' };
    }
  }

  private registerSession(session: DungeonSession): void {
    const state: DungeonRealTimeState = {
      sessionId: session.id,
      playerPositions: session.playerPositions,
      timeBalance: session.timeBalance,
      fragmentProgress: session.fragmentProgress,
      currentTimeFlowRate: session.currentTimeFlowRate,
      events: session.events,
      lastUpdate: Date.now(),
    };
    this.activeSessions.set(session.id, state);
  }

  async startSession(sessionId: string, playerId: string): Promise<ServiceResult> {
    try {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (!session) return { success: false, error: '副本不存在', code: 'SESSION_NOT_FOUND' };
      if (session.leaderId !== playerId) return { success: false, error: '只有队长可以开始', code: 'NOT_LEADER' };

      session.status = DungeonSessionStatus.IN_PROGRESS;
      session.startedAt = new Date();
      await this.sessionRepo.save(session);

      const state = this.activeSessions.get(sessionId);
      if (state) {
        state.lastUpdate = Date.now();
      }

      this.broadcastState(sessionId);
      return { success: true };
    } catch (error) {
      logger.error('Start session error:', error);
      return { success: false, error: '开始副本失败', code: 'INTERNAL_ERROR' };
    }
  }

  async updatePlayerPosition(sessionId: string, playerId: string, x: number, y: number, z: number, hp?: number): Promise<ServiceResult> {
    const state = this.activeSessions.get(sessionId);
    if (!state) return { success: false, error: '副本会话不存在', code: 'SESSION_NOT_FOUND' };

    const pos = state.playerPositions.find(p => p.playerId === playerId);
    if (!pos) return { success: false, error: '玩家不在此副本中', code: 'PLAYER_NOT_FOUND' };

    pos.x = x;
    pos.y = y;
    pos.z = z;
    if (hp !== undefined) {
      pos.hp = Math.max(0, Math.min(pos.maxHp, hp));
      pos.isAlive = pos.hp > 0;
    }
    state.lastUpdate = Date.now();

    return { success: true };
  }

  async collectFragment(sessionId: string, playerId: string): Promise<ServiceResult<CollectedFragment>> {
    try {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (!session) return { success: false, error: '副本不存在', code: 'SESSION_NOT_FOUND' };

      const dungeon = await this.dungeonRepo.findOne({ where: { id: session.dungeonId } });
      if (!dungeon) return { success: false, error: '副本配置丢失', code: 'DUNGEON_NOT_FOUND' };

      if (Math.random() > dungeon.rewards.fragmentChance * this.refreshRateMultiplier) {
        return { success: false, error: '未发现碎片', code: 'NO_FRAGMENT' };
      }

      const quality = this.rollFragmentQuality(dungeon);
      const eras = ['ancient', 'medieval', 'renaissance', 'modern', 'future', 'mythical'];
      const era = weightedRandomChoice(
        eras,
        eras.map((e, i) => e === dungeon.era ? 50 : 10 - i)
      );

      const fragment: CollectedFragment = {
        id: generateId(),
        name: this.generateFragmentName(era, quality),
        quality,
        era,
        collectedBy: playerId,
        collectedAt: new Date(),
      };

      session.collectedFragments.push(fragment);
      session.fragmentProgress = Math.min(100, (session.collectedFragments.length / 10) * 100);
      await this.sessionRepo.save(session);

      const state = this.activeSessions.get(sessionId);
      if (state) {
        state.fragmentProgress = session.fragmentProgress;
      }

      this.broadcastEvent(sessionId, 'fragment_collected', { playerId, fragment });

      return { success: true, data: fragment };
    } catch (error) {
      logger.error('Collect fragment error:', error);
      return { success: false, error: '收集碎片失败', code: 'INTERNAL_ERROR' };
    }
  }

  private rollFragmentQuality(dungeon: Dungeon): string {
    const rareMul = this.rareEventMultiplier;
    const roll = Math.random();
    if (roll < dungeon.rewards.legendaryFragmentChance * rareMul) return 'legendary';
    if (roll < (dungeon.rewards.legendaryFragmentChance + dungeon.rewards.rareFragmentChance) * rareMul) return 'epic';
    if (roll < (dungeon.rewards.legendaryFragmentChance + dungeon.rewards.rareFragmentChance + 0.2) * rareMul) return 'rare';
    if (roll < 0.6) return 'uncommon';
    return 'common';
  }

  private generateFragmentName(era: string, quality: string): string {
    const eraNames: Record<string, string> = { ancient: '远古', medieval: '中古', renaissance: '文艺复兴', modern: '近代', future: '未来', mythical: '神话' };
    const prefixes: Record<string, string> = { common: '残破', uncommon: '黯淡', rare: '闪耀', epic: '辉煌', legendary: '神圣', mythical: '永恒' };
    return `${prefixes[quality] || ''}${eraNames[era] || ''}碎片`;
  }

  private tick(): void {
    const now = Date.now();
    for (const [sessionId, state] of this.activeSessions.entries()) {
      void this.processTick(sessionId, state, now);
    }
  }

  private async processTick(sessionId: string, state: DungeonRealTimeState, now: number): Promise<void> {
    try {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (!session || session.status !== DungeonSessionStatus.IN_PROGRESS) {
        if (session && [DungeonSessionStatus.COMPLETED, DungeonSessionStatus.FAILED, DungeonSessionStatus.ABANDONED].includes(session.status)) {
          this.activeSessions.delete(sessionId);
        }
        return;
      }

      const elapsedMs = now - state.lastUpdate;
      state.lastUpdate = now;

      const timeDecrement = Math.floor(elapsedMs * (state.currentTimeFlowRate / 100) / 1000);
      state.timeBalance = Math.max(0, state.timeBalance - timeDecrement);

      if (Math.random() < 0.01 * this.rareEventMultiplier) {
        this.triggerRandomEvent(sessionId, state, session);
      }

      if (state.timeBalance <= 0) {
        await this.endSession(sessionId, session, state.fragmentProgress >= 100 ? DungeonSessionStatus.COMPLETED : DungeonSessionStatus.FAILED);
        return;
      }

      await this.sessionRepo.update(sessionId, {
        timeBalance: state.timeBalance,
        currentTimeFlowRate: state.currentTimeFlowRate,
        playerPositions: state.playerPositions,
        events: state.events,
        fragmentProgress: state.fragmentProgress,
      });

      this.broadcastState(sessionId);
    } catch (error) {
      logger.error('Process dungeon tick error:', error);
    }
  }

  private triggerRandomEvent(sessionId: string, state: DungeonRealTimeState, session: DungeonSession): void {
    const roll = Math.random();
    let event: DungeonEvent;

    if (roll < 0.4) {
      event = {
        id: generateId(),
        type: 'time_storm',
        timestamp: new Date(),
        data: {
          message: '时间风暴来袭！时间流速突然加快！',
          flowChange: randomInt(50, 150),
          duration: randomInt(10, 30),
        },
      };
      state.currentTimeFlowRate = Math.min(500, state.currentTimeFlowRate + (event.data as any).flowChange);
      setTimeout(() => {
        state.currentTimeFlowRate = session.currentTimeFlowRate;
      }, (event.data as any).duration * 1000);
    } else if (roll < 0.7) {
      event = {
        id: generateId(),
        type: 'correction',
        timestamp: new Date(),
        data: {
          message: '历史修正事件触发！部分碎片可能丢失...',
          lostProgress: randomInt(5, 20),
        },
      };
      state.fragmentProgress = Math.max(0, state.fragmentProgress - (event.data as any).lostProgress);
    } else {
      event = {
        id: generateId(),
        type: 'rift_open',
        timestamp: new Date(),
        data: {
          message: '发现隐藏时光裂缝！可获得额外奖励！',
          bonusGold: randomInt(100, 1000),
          bonusExp: randomInt(50, 500),
        },
      };
    }

    state.events.push(event);
    if (state.events.length > 50) state.events.shift();

    this.broadcastEvent(sessionId, 'dungeon_event', event);
  }

  private async endSession(sessionId: string, session: DungeonSession, status: DungeonSessionStatus): Promise<void> {
    session.status = status;
    session.endedAt = new Date();
    session.duration = Math.floor((session.endedAt.getTime() - (session.startedAt?.getTime() || Date.now())) / 1000);

    const dungeon = await this.dungeonRepo.findOne({ where: { id: session.dungeonId } });
    const rewards: Record<string, any> = { exp: 0, gold: 0, fragments: [] };

    if (dungeon && status === DungeonSessionStatus.COMPLETED) {
      for (const pid of session.playerIds) {
        const player = await this.playerRepo.findOne({ where: { id: pid } });
        if (!player) continue;

        const dungeonBonus = await this.guildService.getPlayerDungeonBonus(pid);
        const baseExp = Math.floor(dungeon.rewards.exp * dungeonBonus);
        const baseGold = Math.floor(dungeon.rewards.gold * dungeonBonus);

        player.exp += baseExp;
        player.gold += baseGold;
        rewards.exp += baseExp;
        rewards.gold += baseGold;

        while (player.exp >= Math.floor(100 * Math.pow(player.level, 1.5))) {
          player.exp -= Math.floor(100 * Math.pow(player.level, 1.5));
          player.level++;
        }

        await this.playerRepo.save(player);
        await this.achievementService.updateProgress(pid, 'DUNGEON_CLEAR', 1);

        for (const collected of session.collectedFragments.filter(f => f.collectedBy === pid)) {
          const inventory = await this.inventoryRepo.findOne({ where: { playerId: pid } });
          if (inventory) {
            const fragment = this.fragmentRepo.create({
              id: collected.id,
              name: collected.name,
              era: collected.era as any,
              quality: collected.quality as any,
              slotPosition: randomInt(1, 4),
              temporalEnergy: randomInt(10, 100),
              attributes: {
                attack: randomInt(5, 50),
                defense: randomInt(5, 50),
                speed: randomInt(5, 50),
                hp: randomInt(50, 500),
              },
              inventoryId: inventory.id,
            });
            await this.fragmentRepo.save(fragment);
            rewards.fragments.push(fragment.id);
          }
        }
      }
    }

    dungeon!.popularity++;
    await this.dungeonRepo.save(dungeon!);

    session.rewards = rewards;
    await this.sessionRepo.save(session);

    for (const pid of session.playerIds) {
      await this.playerRepo.update(pid, { status: PlayerStatus.ONLINE });
    }

    this.activeSessions.delete(sessionId);
    this.broadcastEvent(sessionId, 'session_ended', { status, rewards });
  }

  async abandonSession(sessionId: string, playerId: string): Promise<ServiceResult> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return { success: false, error: '副本不存在', code: 'SESSION_NOT_FOUND' };
    if (!session.playerIds.includes(playerId)) return { success: false, error: '你不在此副本中', code: 'NOT_IN_SESSION' };

    const state = this.activeSessions.get(sessionId);
    if (state) {
      await this.endSession(sessionId, session, DungeonSessionStatus.ABANDONED);
    }
    return { success: true };
  }

  private broadcastState(sessionId: string): void {
    if (!this.io) return;
    const state = this.activeSessions.get(sessionId);
    if (!state) return;
    this.io.to(`dungeon:${sessionId}`).emit('dungeon:state', state);
  }

  private broadcastEvent(sessionId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`dungeon:${sessionId}`).emit(`dungeon:${event}`, data);
  }

  async listDungeons(page: number = 1, pageSize: number = 20): Promise<ServiceResult<any>> {
    try {
      const [items, total] = await this.dungeonRepo.findAndCount({
        where: { isActive: true },
        order: { popularity: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return {
        success: true,
        data: {
          items, total, page, pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error('List dungeons error:', error);
      return { success: false, error: '获取副本列表失败' };
    }
  }

  getSessionState(sessionId: string): DungeonRealTimeState | undefined {
    return this.activeSessions.get(sessionId);
  }
}
