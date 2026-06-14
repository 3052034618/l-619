import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { LeagueMatch, MatchStatus, LeaguePlayer } from '../entities/LeagueMatch';
import { LeagueRank, LeagueTier } from '../entities/LeagueRank';
import { Player, PlayerStatus } from '../entities/Player';
import { Sandglass } from '../entities/Sandglass';
import { Fragment, FragmentQuality, FragmentEra } from '../entities/Fragment';
import { PlayerInventory } from '../entities/PlayerInventory';
import { logger } from '../utils/logger';
import { generateId, randomInt, clamp } from '../utils';
import { ServiceResult } from '../types';
import { Server } from 'socket.io';
import { AchievementService } from './AchievementService';

export interface MatchQueueEntry {
  playerId: string;
  sandglassId: string;
  joinedAt: number;
  points: number;
}

export interface ActiveMatchState {
  matchId: string;
  player1: LeaguePlayer;
  player2: LeaguePlayer;
  startTime: number;
  lastUpdate: number;
  eventLog: Array<any>;
}

export class LeagueManager {
  private static instance: LeagueManager;
  private matchRepo: Repository<LeagueMatch>;
  private rankRepo: Repository<LeagueRank>;
  private playerRepo: Repository<Player>;
  private sandglassRepo: Repository<Sandglass>;
  private fragmentRepo: Repository<Fragment>;
  private inventoryRepo: Repository<PlayerInventory>;
  private achievementService: AchievementService;
  private io: Server | null = null;
  private matchQueue: MatchQueueEntry[] = [];
  private activeMatches: Map<string, ActiveMatchState> = new Map();
  private currentSeason: number = 1;
  private tickInterval: NodeJS.Timeout | null = null;
  private matchInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.matchRepo = AppDataSource.getRepository(LeagueMatch);
    this.rankRepo = AppDataSource.getRepository(LeagueRank);
    this.playerRepo = AppDataSource.getRepository(Player);
    this.sandglassRepo = AppDataSource.getRepository(Sandglass);
    this.fragmentRepo = AppDataSource.getRepository(Fragment);
    this.inventoryRepo = AppDataSource.getRepository(PlayerInventory);
    this.achievementService = AchievementService.getInstance();
  }

  static getInstance(): LeagueManager {
    if (!LeagueManager.instance) {
      LeagueManager.instance = new LeagueManager();
    }
    return LeagueManager.instance;
  }

  setSocketServer(io: Server): void {
    this.io = io;
  }

  start(): void {
    this.tickInterval = setInterval(() => this.tick(), 100);
    this.matchInterval = setInterval(() => this.processMatchmaking(), 3000);
    logger.info('LeagueManager started');
  }

  stop(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.matchInterval) clearInterval(this.matchInterval);
  }

  async joinQueue(playerId: string, sandglassId: string): Promise<ServiceResult> {
    try {
      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      if (!player) return { success: false, error: '玩家不存在', code: 'PLAYER_NOT_FOUND' };
      if (player.status !== PlayerStatus.ONLINE) {
        return { success: false, error: '玩家状态不允许参赛', code: 'INVALID_STATUS' };
      }

      const sandglass = await this.sandglassRepo.findOne({
        where: { id: sandglassId, ownerId: playerId },
      });
      if (!sandglass) {
        return { success: false, error: '沙漏不存在或不属于你', code: 'SANDGLASS_NOT_FOUND' };
      }
      if (sandglass.remainingUses <= 0) {
        return { success: false, error: '沙漏使用次数已耗尽', code: 'NO_USES_LEFT' };
      }

      if (this.matchQueue.find(q => q.playerId === playerId)) {
        return { success: false, error: '已在匹配队列中', code: 'ALREADY_IN_QUEUE' };
      }
      if (this.getActiveMatchByPlayer(playerId)) {
        return { success: false, error: '正在比赛中', code: 'IN_MATCH' };
      }

      const rank = await this.getOrCreateRank(playerId);

      this.matchQueue.push({
        playerId,
        sandglassId,
        joinedAt: Date.now(),
        points: rank.points,
      });

      player.status = PlayerStatus.IN_LEAGUE;
      await this.playerRepo.save(player);

      return { success: true, data: { queuePosition: this.matchQueue.length } };
    } catch (error) {
      logger.error('Join league queue error:', error);
      return { success: false, error: '加入匹配队列失败', code: 'INTERNAL_ERROR' };
    }
  }

  async leaveQueue(playerId: string): Promise<ServiceResult> {
    const index = this.matchQueue.findIndex(q => q.playerId === playerId);
    if (index === -1) {
      return { success: false, error: '不在匹配队列中', code: 'NOT_IN_QUEUE' };
    }
    this.matchQueue.splice(index, 1);
    await this.playerRepo.update(playerId, { status: PlayerStatus.ONLINE });
    return { success: true };
  }

  private processMatchmaking(): void {
    if (this.matchQueue.length < 2) return;

    this.matchQueue.sort((a, b) => Math.abs(a.points - b.points));

    const matched: string[] = [];
    for (let i = 0; i < this.matchQueue.length - 1; i += 2) {
      const p1 = this.matchQueue[i];
      const p2 = this.matchQueue[i + 1];
      const waitTime = (Date.now() - p1.joinedAt) / 1000;
      const pointDiff = Math.abs(p1.points - p2.points);

      if (pointDiff <= 200 + waitTime * 10) {
        matched.push(p1.playerId, p2.playerId);
        void this.createMatch(p1, p2);
      }
    }

    this.matchQueue = this.matchQueue.filter(q => !matched.includes(q.playerId));
  }

  private async createMatch(p1: MatchQueueEntry, p2: MatchQueueEntry): Promise<void> {
    try {
      const player1Data = await this.buildLeaguePlayer(p1.playerId, p1.sandglassId);
      const player2Data = await this.buildLeaguePlayer(p2.playerId, p2.sandglassId);
      if (!player1Data || !player2Data) return;

      const match = this.matchRepo.create({
        id: generateId(),
        season: this.currentSeason,
        player1Id: p1.playerId,
        player2Id: p2.playerId,
        player1: player1Data,
        player2: player2Data,
        status: MatchStatus.READY,
      });
      const saved = await this.matchRepo.save(match);

      const state: ActiveMatchState = {
        matchId: saved.id,
        player1: player1Data,
        player2: player2Data,
        startTime: Date.now(),
        lastUpdate: Date.now(),
        eventLog: [],
      };
      this.activeMatches.set(saved.id, state);

      if (this.io) {
        this.io.to(`player:${p1.playerId}`).emit('league:match_found', { matchId: saved.id, opponent: player2Data });
        this.io.to(`player:${p2.playerId}`).emit('league:match_found', { matchId: saved.id, opponent: player1Data });
      }

      setTimeout(() => this.startMatch(saved.id), 5000);
    } catch (error) {
      logger.error('Create match error:', error);
    }
  }

  private async buildLeaguePlayer(playerId: string, sandglassId: string): Promise<LeaguePlayer | null> {
    const player = await this.playerRepo.findOne({ where: { id: playerId } });
    const sandglass = await this.sandglassRepo.findOne({ where: { id: sandglassId } });
    if (!player || !sandglass) return null;

    return {
      id: player.id,
      name: player.nickname || player.username,
      avatar: player.avatar || '',
      level: player.level,
      sandglassId: sandglass.id,
      sandglassName: sandglass.name,
      sandglassRarity: sandglass.rarity,
      temporalControl: sandglass.temporalControl,
      hp: 1000 + sandglass.temporalControl,
      maxHp: 1000 + sandglass.temporalControl,
      timeFieldCoverage: 50,
      remainingTime: 120,
      skills: sandglass.affixes.map(a => ({
        id: a.type,
        name: a.name,
        cooldown: 0,
        maxCooldown: a.cooldown,
        ready: true,
      })),
      counters: [],
    };
  }

  private async startMatch(matchId: string): Promise<void> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) return;

    match.status = MatchStatus.IN_PROGRESS;
    match.startedAt = new Date();
    await this.matchRepo.save(match);

    const state = this.activeMatches.get(matchId);
    if (state) {
      state.startTime = Date.now();
      state.lastUpdate = Date.now();
    }

    this.broadcastMatchState(matchId);
  }

  async activateSkill(matchId: string, playerId: string, skillId: string, targetId?: string): Promise<ServiceResult> {
    const state = this.activeMatches.get(matchId);
    if (!state) return { success: false, error: '比赛不存在', code: 'MATCH_NOT_FOUND' };

    const isPlayer1 = state.player1.id === playerId;
    const attacker = isPlayer1 ? state.player1 : state.player2;
    const defender = isPlayer1 ? state.player2 : state.player1;

    const skill = attacker.skills.find(s => s.id === skillId);
    if (!skill) return { success: false, error: '技能不存在', code: 'SKILL_NOT_FOUND' };
    if (!skill.ready) return { success: false, error: '技能冷却中', code: 'SKILL_COOLDOWN' };
    if (attacker.remainingTime < 10) return { success: false, error: '时间不足', code: 'NO_TIME' };

    skill.ready = false;
    skill.cooldown = skill.maxCooldown;
    attacker.remainingTime -= 10;

    const damage = this.calculateSkillDamage(skillId, attacker.temporalControl);
    defender.hp = Math.max(0, defender.hp - damage);
    attacker.timeFieldCoverage = Math.min(100, attacker.timeFieldCoverage + 5);
    defender.timeFieldCoverage = Math.max(0, defender.timeFieldCoverage - 3);

    state.eventLog.push({
      timestamp: Date.now() - state.startTime,
      type: 'skill',
      playerId,
      data: { skillId, skillName: skill.name, damage, targetId: defender.id },
    });
    state.lastUpdate = Date.now();

    this.broadcastMatchEvent(matchId, 'skill_used', {
      attackerId: playerId,
      skillId,
      skillName: skill.name,
      damage,
      defenderHp: defender.hp,
    });

    if (defender.hp <= 0) {
      await this.endMatch(matchId, playerId);
    }

    return { success: true };
  }

  async counterSkill(matchId: string, playerId: string): Promise<ServiceResult> {
    const state = this.activeMatches.get(matchId);
    if (!state) return { success: false, error: '比赛不存在', code: 'MATCH_NOT_FOUND' };

    const player = state.player1.id === playerId ? state.player1 : state.player2;
    if (player.remainingTime < 20) return { success: false, error: '时间不足', code: 'NO_TIME' };

    player.remainingTime -= 20;
    player.counters.push({
      id: generateId(),
      name: '时空反制',
      active: true,
      duration: 5000,
    });

    state.eventLog.push({
      timestamp: Date.now() - state.startTime,
      type: 'counter',
      playerId,
      data: {},
    });

    this.broadcastMatchEvent(matchId, 'counter_activated', { playerId });
    return { success: true };
  }

  private calculateSkillDamage(skillId: string, temporalControl: number): number {
    const baseDamage: Record<string, number> = {
      time_stop: 80,
      time_accelerate: 50,
      time_reversal: 120,
      time_dilation: 60,
      time_shield: 30,
      temporal_burst: 150,
      paradox: 100,
      eternity: 200,
    };
    return Math.floor((baseDamage[skillId] || 50) * (1 + temporalControl / 500));
  }

  private tick(): void {
    const now = Date.now();
    for (const [matchId, state] of this.activeMatches.entries()) {
      const elapsed = (now - state.lastUpdate) / 1000;
      state.lastUpdate = now;

      state.player1.remainingTime = Math.max(0, state.player1.remainingTime - elapsed);
      state.player2.remainingTime = Math.max(0, state.player2.remainingTime - elapsed);

      for (const skill of state.player1.skills) {
        if (!skill.ready) {
          skill.cooldown = Math.max(0, skill.cooldown - elapsed);
          if (skill.cooldown <= 0) skill.ready = true;
        }
      }
      for (const skill of state.player2.skills) {
        if (!skill.ready) {
          skill.cooldown = Math.max(0, skill.cooldown - elapsed);
          if (skill.cooldown <= 0) skill.ready = true;
        }
      }

      if (state.player1.hp > 0 && state.player2.hp > 0) {
        const autoDmg1 = Math.floor(5 * (1 + state.player1.temporalControl / 1000) * elapsed);
        const autoDmg2 = Math.floor(5 * (1 + state.player2.temporalControl / 1000) * elapsed);
        state.player2.hp = Math.max(0, state.player2.hp - autoDmg1);
        state.player1.hp = Math.max(0, state.player1.hp - autoDmg2);
      }

      if (state.player1.hp <= 0 || state.player2.hp <= 0) {
        const winnerId = state.player1.hp > 0 ? state.player1.id : state.player2.id;
        void this.endMatch(matchId, winnerId);
        continue;
      }

      if (state.player1.remainingTime <= 0 || state.player2.remainingTime <= 0) {
        const winnerId = state.player1.remainingTime > 0 ? state.player1.id : state.player2.id;
        void this.endMatch(matchId, winnerId);
        continue;
      }

      if (now - state.startTime > 300000) {
        const winnerId = state.player1.hp > state.player2.hp ? state.player1.id : state.player2.id;
        void this.endMatch(matchId, winnerId);
      }

      this.broadcastMatchState(matchId);
    }
  }

  private async endMatch(matchId: string, winnerId: string): Promise<void> {
    const state = this.activeMatches.get(matchId);
    if (!state) return;

    try {
      const match = await this.matchRepo.findOne({ where: { id: matchId } });
      if (!match || match.status === MatchStatus.COMPLETED) return;

      const loserId = winnerId === state.player1.id ? state.player2.id : state.player1.id;
      const winnerRank = await this.getOrCreateRank(winnerId);
      const loserRank = await this.getOrCreateRank(loserId);

      const winnerChange = Math.max(5, 30 - (winnerRank.points - loserRank.points) / 20);
      const loserChange = -Math.max(5, 20 + (winnerRank.points - loserRank.points) / 30);

      winnerRank.points += winnerChange;
      winnerRank.wins++;
      winnerRank.winStreak++;
      winnerRank.maxWinStreak = Math.max(winnerRank.maxWinStreak, winnerRank.winStreak);
      winnerRank.tier = this.calculateTier(winnerRank.points);

      loserRank.points = Math.max(0, loserRank.points + loserChange);
      loserRank.losses++;
      loserRank.winStreak = 0;
      loserRank.tier = this.calculateTier(loserRank.points);

      await this.rankRepo.save([winnerRank, loserRank]);

      match.status = MatchStatus.COMPLETED;
      match.winnerId = winnerId;
      match.player1ScoreChange = match.player1Id === winnerId ? winnerChange : loserChange;
      match.player2ScoreChange = match.player2Id === winnerId ? winnerChange : loserChange;
      match.endedAt = new Date();
      match.duration = Math.floor((match.endedAt.getTime() - (match.startedAt?.getTime() || Date.now())) / 1000);
      match.eventLog = state.eventLog;
      await this.matchRepo.save(match);

      const winner = await this.playerRepo.findOne({ where: { id: winnerId } });
      if (winner) {
        winner.leaguePoints = winnerRank.points;
        winner.status = PlayerStatus.ONLINE;
        await this.playerRepo.save(winner);
      }
      const loser = await this.playerRepo.findOne({ where: { id: loserId } });
      if (loser) {
        loser.leaguePoints = loserRank.points;
        loser.status = PlayerStatus.ONLINE;
        await this.playerRepo.save(loser);
      }

      const winnerSandglass = await this.sandglassRepo.findOne({ where: { id: state.player1.id === winnerId ? state.player1.sandglassId : state.player2.sandglassId } });
      if (winnerSandglass) {
        winnerSandglass.remainingUses = Math.max(0, winnerSandglass.remainingUses - 1);
        winnerSandglass.totalUsed++;
        winnerSandglass.pvpKills++;
        await this.sandglassRepo.save(winnerSandglass);
      }

      const rewardFragments = await this.distributeMatchRewards(winnerId, winnerRank.tier);

      await this.achievementService.updateProgress(winnerId, 'LEAGUE_WIN', 1);

      if (this.io) {
        this.io.to(`player:${winnerId}`).emit('league:match_result', {
          result: 'win',
          scoreChange: winnerChange,
          rewards: { fragments: rewardFragments },
        });
        this.io.to(`player:${loserId}`).emit('league:match_result', {
          result: 'lose',
          scoreChange: loserChange,
          rewards: { fragments: [] },
        });
      }

      this.activeMatches.delete(matchId);
    } catch (error) {
      logger.error('End match error:', error);
      this.activeMatches.delete(matchId);
    }
  }

  private async distributeMatchRewards(winnerId: string, tier: LeagueTier): Promise<any[]> {
    try {
      const inventory = await this.inventoryRepo.findOne({ where: { playerId: winnerId } });
      if (!inventory) return [];

      const tierRewardMap: Record<string, { count: number; minQuality: FragmentQuality }> = {
        [LeagueTier.BRONZE]: { count: 1, minQuality: FragmentQuality.COMMON },
        [LeagueTier.SILVER]: { count: 1, minQuality: FragmentQuality.UNCOMMON },
        [LeagueTier.GOLD]: { count: 2, minQuality: FragmentQuality.UNCOMMON },
        [LeagueTier.PLATINUM]: { count: 2, minQuality: FragmentQuality.RARE },
        [LeagueTier.DIAMOND]: { count: 3, minQuality: FragmentQuality.RARE },
        [LeagueTier.MASTER]: { count: 3, minQuality: FragmentQuality.EPIC },
        [LeagueTier.GRANDMASTER]: { count: 4, minQuality: FragmentQuality.EPIC },
      };

      const rewardConfig = tierRewardMap[tier] || tierRewardMap[LeagueTier.BRONZE];
      const qualities: FragmentQuality[] = Object.values(FragmentQuality);
      const eras: FragmentEra[] = Object.values(FragmentEra);
      const minQualityIdx = qualities.indexOf(rewardConfig.minQuality);

      const fragmentNames = ['时空残片', '时光碎屑', '命运沙粒', '永恒结晶', '星辰碎片', '虚空精华'];
      const rewards: any[] = [];

      for (let i = 0; i < rewardConfig.count; i++) {
        const qualityIdx = Math.min(
          qualities.length - 1,
          minQualityIdx + Math.floor(Math.random() * 2)
        );
        const quality = qualities[qualityIdx];
        const era = eras[Math.floor(Math.random() * eras.length)];
        const qualityMultiplier: Record<string, number> = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16, mythical: 32 };

        const fragment = this.fragmentRepo.create({
          id: generateId(),
          name: `${fragmentNames[Math.floor(Math.random() * fragmentNames.length)]}·${era}`,
          description: `时光联赛胜利奖励`,
          era,
          quality,
          slotPosition: (i % 4) + 1,
          temporalEnergy: 20 + Math.floor(Math.random() * 30) * (qualityMultiplier[quality] || 1),
          attributes: {
            attack: Math.floor(Math.random() * 10 * (qualityMultiplier[quality] || 1)),
            defense: Math.floor(Math.random() * 10 * (qualityMultiplier[quality] || 1)),
            speed: Math.floor(Math.random() * 5 * (qualityMultiplier[quality] || 1)),
            hp: Math.floor(Math.random() * 50 * (qualityMultiplier[quality] || 1)),
          },
          inventoryId: inventory.id,
          isListed: false,
          suggestedPrice: 100 * (qualityMultiplier[quality] || 1),
        });

        const saved = await this.fragmentRepo.save(fragment);
        rewards.push({
          id: saved.id,
          name: saved.name,
          quality: saved.quality,
          era: saved.era,
          temporalEnergy: saved.temporalEnergy,
        });
      }

      return rewards;
    } catch (error) {
      logger.error('Distribute match rewards error:', error);
      return [];
    }
  }

  private calculateTier(points: number): LeagueTier {
    if (points >= 2500) return LeagueTier.GRANDMASTER;
    if (points >= 2000) return LeagueTier.MASTER;
    if (points >= 1500) return LeagueTier.DIAMOND;
    if (points >= 1000) return LeagueTier.PLATINUM;
    if (points >= 600) return LeagueTier.GOLD;
    if (points >= 300) return LeagueTier.SILVER;
    return LeagueTier.BRONZE;
  }

  private async getOrCreateRank(playerId: string): Promise<LeagueRank> {
    let rank = await this.rankRepo.findOne({
      where: { playerId, season: this.currentSeason },
    });
    if (!rank) {
      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      rank = this.rankRepo.create({
        id: generateId(),
        playerId,
        playerName: player?.nickname || player?.username || 'Unknown',
        season: this.currentSeason,
        tier: LeagueTier.BRONZE,
        points: 100,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        maxWinStreak: 0,
      });
      rank = await this.rankRepo.save(rank);
    }
    return rank;
  }

  private getActiveMatchByPlayer(playerId: string): ActiveMatchState | undefined {
    for (const state of this.activeMatches.values()) {
      if (state.player1.id === playerId || state.player2.id === playerId) {
        return state;
      }
    }
    return undefined;
  }

  getActiveMatchState(matchId: string): ActiveMatchState | undefined {
    return this.activeMatches.get(matchId);
  }

  private broadcastMatchState(matchId: string): void {
    if (!this.io) return;
    const state = this.activeMatches.get(matchId);
    if (!state) return;
    this.io.to(`match:${matchId}`).emit('league:state', {
      matchId,
      player1: state.player1,
      player2: state.player2,
      elapsed: Date.now() - state.startTime,
    });
  }

  private broadcastMatchEvent(matchId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`match:${matchId}`).emit(`league:${event}`, data);
  }

  async getLeaderboard(season?: number, page: number = 1, pageSize: number = 20): Promise<ServiceResult<any>> {
    try {
      const s = season || this.currentSeason;
      const [items, total] = await this.rankRepo.findAndCount({
        where: { season: s },
        order: { points: 'DESC', wins: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return {
        success: true,
        data: { items, total, page, pageSize, season: s, totalPages: Math.ceil(total / pageSize) },
      };
    } catch (error) {
      logger.error('Get leaderboard error:', error);
      return { success: false, error: '获取排行榜失败' };
    }
  }

  async getMatchHistory(playerId: string, page: number = 1, pageSize: number = 20): Promise<ServiceResult<any>> {
    try {
      const [items, total] = await this.matchRepo.findAndCount({
        where: [{ player1Id: playerId }, { player2Id: playerId }],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return {
        success: true,
        data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      };
    } catch (error) {
      logger.error('Get match history error:', error);
      return { success: false, error: '获取对战历史失败' };
    }
  }
}
