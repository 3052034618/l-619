import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Achievement, PlayerAchievement, AchievementType } from '../entities/Achievement';
import { Player } from '../entities/Player';
import { logger } from '../utils/logger';
import { ServiceResult } from '../types';

export class AchievementService {
  private static instance: AchievementService;
  private achievementRepo: Repository<Achievement>;
  private playerAchievementRepo: Repository<PlayerAchievement>;
  private playerRepo: Repository<Player>;

  private constructor() {
    this.achievementRepo = AppDataSource.getRepository(Achievement);
    this.playerAchievementRepo = AppDataSource.getRepository(PlayerAchievement);
    this.playerRepo = AppDataSource.getRepository(Player);
  }

  static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  async initDefaultAchievements(): Promise<void> {
    const defaults: Array<Partial<Achievement>> = [
      { name: '初次合成', description: '完成第一次沙漏合成', type: AchievementType.CRAFT, code: 'CRAFT_FIRST', targetValue: 1, rewards: { exp: 100, gold: 500 }, points: 10 },
      { name: '工匠学徒', description: '成功合成10个沙漏', type: AchievementType.CRAFT, code: 'CRAFT_10', targetValue: 10, rewards: { exp: 500, gold: 2000 }, points: 25 },
      { name: '工艺大师', description: '成功合成100个沙漏', type: AchievementType.CRAFT, code: 'CRAFT_100', targetValue: 100, rewards: { exp: 5000, gold: 20000, gems: 100 }, points: 100 },
      { name: '稀有收藏家', description: '收集5个稀有沙漏', type: AchievementType.COLLECTION, code: 'COLLECT_RARE_5', targetValue: 5, rewards: { exp: 1000, gold: 5000 }, points: 50 },
      { name: '传说在手', description: '获得1个传说沙漏', type: AchievementType.COLLECTION, code: 'COLLECT_LEGENDARY', targetValue: 1, rewards: { exp: 5000, gold: 50000, gems: 200 }, points: 200 },
      { name: '时光探险家', description: '完成10次时光副本', type: AchievementType.DUNGEON, code: 'DUNGEON_10', targetValue: 10, rewards: { exp: 1000, gold: 3000 }, points: 30 },
      { name: '时间征服者', description: '完成100次时光副本', type: AchievementType.DUNGEON, code: 'DUNGEON_100', targetValue: 100, rewards: { exp: 10000, gold: 30000, gems: 150 }, points: 150 },
      { name: '初露锋芒', description: '赢得第一场联赛', type: AchievementType.LEAGUE, code: 'LEAGUE_FIRST_WIN', targetValue: 1, rewards: { exp: 200, gold: 1000 }, points: 15 },
      { name: '百战百胜', description: '赢得100场联赛', type: AchievementType.LEAGUE, code: 'LEAGUE_100_WINS', targetValue: 100, rewards: { exp: 10000, gold: 100000, gems: 300 }, points: 300 },
      { name: '精明商人', description: '完成10笔交易', type: AchievementType.TRADE, code: 'TRADE_10', targetValue: 10, rewards: { exp: 500, gold: 2000 }, points: 20 },
    ];

    for (const data of defaults) {
      const exists = await this.achievementRepo.findOne({ where: { code: data.code } });
      if (!exists) {
        await this.achievementRepo.save(this.achievementRepo.create(data));
      }
    }
  }

  async updateProgress(playerId: string, achievementCode: string, increment: number = 1): Promise<ServiceResult<PlayerAchievement[]>> {
    try {
      const achievements = await this.achievementRepo
        .createQueryBuilder('a')
        .where('a.code LIKE :code', { code: `${achievementCode}%` })
        .getMany();

      const updated: PlayerAchievement[] = [];

      for (const achievement of achievements) {
        let pa = await this.playerAchievementRepo.findOne({
          where: { playerId, achievementId: achievement.id },
        });

        if (!pa) {
          pa = this.playerAchievementRepo.create({
            playerId,
            achievementId: achievement.id,
            progress: 0,
            isCompleted: false,
          });
        }

        if (pa.isCompleted) continue;

        pa.progress = Math.min(pa.progress + increment, achievement.targetValue);

        if (pa.progress >= achievement.targetValue && !pa.isCompleted) {
          pa.isCompleted = true;
          pa.completedAt = new Date();
          await this.claimReward(playerId, achievement.id);
        }

        updated.push(await this.playerAchievementRepo.save(pa));
      }

      return { success: true, data: updated };
    } catch (error) {
      logger.error('Update achievement progress error:', error);
      return { success: false, error: '更新成就进度失败' };
    }
  }

  async claimReward(playerId: string, achievementId: string): Promise<ServiceResult> {
    try {
      const pa = await this.playerAchievementRepo.findOne({
        where: { playerId, achievementId, isCompleted: true, isClaimed: false },
      });
      if (!pa) {
        return { success: false, error: '成就未完成或已领取' };
      }

      const achievement = await this.achievementRepo.findOne({ where: { id: achievementId } });
      if (!achievement) {
        return { success: false, error: '成就不存在' };
      }

      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      if (!player) {
        return { success: false, error: '玩家不存在' };
      }

      if (achievement.rewards.exp) player.exp += achievement.rewards.exp;
      if (achievement.rewards.gold) player.gold += achievement.rewards.gold;
      if (achievement.rewards.gems) player.gems += achievement.rewards.gems;

      while (player.exp >= this.getExpForLevel(player.level)) {
        player.exp -= this.getExpForLevel(player.level);
        player.level++;
      }

      pa.isClaimed = true;
      pa.claimedAt = new Date();

      await this.playerRepo.save(player);
      await this.playerAchievementRepo.save(pa);

      return { success: true };
    } catch (error) {
      logger.error('Claim achievement reward error:', error);
      return { success: false, error: '领取奖励失败' };
    }
  }

  private getExpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  async getPlayerAchievements(playerId: string): Promise<ServiceResult<any[]>> {
    try {
      const achievements = await this.achievementRepo.find({ order: { displayOrder: 'ASC' } });
      const playerAchievements = await this.playerAchievementRepo.find({ where: { playerId } });

      const result = achievements.map(a => {
        const pa = playerAchievements.find(p => p.achievementId === a.id);
        return {
          ...a,
          progress: pa?.progress || 0,
          isCompleted: pa?.isCompleted || false,
          isClaimed: pa?.isClaimed || false,
          completedAt: pa?.completedAt || null,
        };
      });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Get player achievements error:', error);
      return { success: false, error: '获取成就列表失败' };
    }
  }
}
