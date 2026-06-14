import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Player, PlayerStatus } from '../entities/Player';
import { PlayerInventory } from '../entities/PlayerInventory';
import { logger } from '../utils/logger';
import { hashPassword, verifyPassword, generateToken, generateId, getExpForLevel } from '../utils';
import { ServiceResult } from '../types';
import { AchievementService } from './AchievementService';

export class PlayerService {
  private static instance: PlayerService;
  private playerRepo: Repository<Player>;
  private inventoryRepo: Repository<PlayerInventory>;
  private achievementService: AchievementService;

  private constructor() {
    this.playerRepo = AppDataSource.getRepository(Player);
    this.inventoryRepo = AppDataSource.getRepository(PlayerInventory);
    this.achievementService = AchievementService.getInstance();
  }

  static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  async register(username: string, password: string, nickname?: string): Promise<ServiceResult<{ player: Player; token: string }>> {
    try {
      if (username.length < 3 || username.length > 50) {
        return { success: false, error: '用户名长度需在3-50字符之间', code: 'INVALID_USERNAME' };
      }
      if (password.length < 6) {
        return { success: false, error: '密码长度至少6位', code: 'INVALID_PASSWORD' };
      }

      const existing = await this.playerRepo.findOne({ where: { username } });
      if (existing) {
        return { success: false, error: '用户名已存在', code: 'USERNAME_EXISTS' };
      }

      const hashedPassword = await hashPassword(password);

      const player = this.playerRepo.create({
        id: generateId(),
        username,
        password: hashedPassword,
        nickname: nickname || username,
        status: PlayerStatus.OFFLINE,
      });
      const savedPlayer = await this.playerRepo.save(player);

      const inventory = this.inventoryRepo.create({
        id: generateId(),
        playerId: savedPlayer.id,
      });
      await this.inventoryRepo.save(inventory);

      const token = generateToken({ playerId: savedPlayer.id, username: savedPlayer.username });
      return { success: true, data: { player: savedPlayer, token } };
    } catch (error) {
      logger.error('Register error:', error);
      return { success: false, error: '注册失败，请稍后重试', code: 'INTERNAL_ERROR' };
    }
  }

  async login(username: string, password: string): Promise<ServiceResult<{ player: Player; token: string }>> {
    try {
      const player = await this.playerRepo
        .createQueryBuilder('p')
        .addSelect('p.password')
        .where('p.username = :username', { username })
        .getOne();

      if (!player) {
        return { success: false, error: '用户名或密码错误', code: 'INVALID_CREDENTIALS' };
      }

      const isValid = await verifyPassword(password, player.password);
      if (!isValid) {
        return { success: false, error: '用户名或密码错误', code: 'INVALID_CREDENTIALS' };
      }

      player.status = PlayerStatus.ONLINE;
      player.lastLoginAt = new Date();
      await this.playerRepo.save(player);

      const { password: _, ...playerWithoutPassword } = player as any;
      const token = generateToken({ playerId: player.id, username: player.username });
      return { success: true, data: { player: playerWithoutPassword as Player, token } };
    } catch (error) {
      logger.error('Login error:', error);
      return { success: false, error: '登录失败，请稍后重试', code: 'INTERNAL_ERROR' };
    }
  }

  async logout(playerId: string): Promise<ServiceResult> {
    try {
      await this.playerRepo.update(playerId, { status: PlayerStatus.OFFLINE });
      return { success: true };
    } catch (error) {
      logger.error('Logout error:', error);
      return { success: false, error: '登出失败' };
    }
  }

  async getPlayer(playerId: string): Promise<ServiceResult<Player>> {
    try {
      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      if (!player) return { success: false, error: '玩家不存在', code: 'NOT_FOUND' };
      return { success: true, data: player };
    } catch (error) {
      logger.error('Get player error:', error);
      return { success: false, error: '获取玩家信息失败' };
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<ServiceResult<Player>> {
    try {
      if (updates.username || updates.password) {
        return { success: false, error: '不能修改用户名或密码', code: 'INVALID_FIELD' };
      }
      await this.playerRepo.update(playerId, updates);
      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      if (!player) return { success: false, error: '玩家不存在', code: 'NOT_FOUND' };
      return { success: true, data: player };
    } catch (error) {
      logger.error('Update player error:', error);
      return { success: false, error: '更新失败' };
    }
  }

  async saveWorkshopLayout(playerId: string, layout: Record<string, any>): Promise<ServiceResult> {
    try {
      await this.playerRepo.update(playerId, { workshopLayout: layout });
      return { success: true };
    } catch (error) {
      logger.error('Save workshop layout error:', error);
      return { success: false, error: '保存布局失败' };
    }
  }

  async addExp(playerId: string, exp: number): Promise<ServiceResult<{ leveledUp: boolean; newLevel: number }>> {
    try {
      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      if (!player) return { success: false, error: '玩家不存在', code: 'NOT_FOUND' };

      player.exp += exp;
      let leveledUp = false;

      while (player.exp >= getExpForLevel(player.level)) {
        player.exp -= getExpForLevel(player.level);
        player.level++;
        leveledUp = true;
        await this.achievementService.updateProgress(playerId, 'LEVEL_UP', player.level);
      }

      await this.playerRepo.save(player);
      return { success: true, data: { leveledUp, newLevel: player.level } };
    } catch (error) {
      logger.error('Add exp error:', error);
      return { success: false, error: '添加经验失败' };
    }
  }

  async searchPlayers(query: string, page: number = 1, pageSize: number = 20): Promise<ServiceResult<any>> {
    try {
      const [items, total] = await this.playerRepo
        .createQueryBuilder('p')
        .where('p.username ILIKE :query OR p.nickname ILIKE :query', { query: `%${query}%` })
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();

      return {
        success: true,
        data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      };
    } catch (error) {
      logger.error('Search players error:', error);
      return { success: false, error: '搜索失败' };
    }
  }
}
