import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Guild, GuildStatus } from '../entities/Guild';
import { GuildMember, GuildRole } from '../entities/GuildMember';
import { GuildBuilding, BuildingType } from '../entities/GuildBuilding';
import { Player } from '../entities/Player';
import { logger } from '../utils/logger';
import { ServiceResult, PaginatedResult } from '../types';
import { generateId } from '../utils';
import { AchievementService } from './AchievementService';

export class GuildService {
  private static instance: GuildService;
  private guildRepo: Repository<Guild>;
  private memberRepo: Repository<GuildMember>;
  private buildingRepo: Repository<GuildBuilding>;
  private playerRepo: Repository<Player>;
  private achievementService: AchievementService;

  private constructor() {
    this.guildRepo = AppDataSource.getRepository(Guild);
    this.memberRepo = AppDataSource.getRepository(GuildMember);
    this.buildingRepo = AppDataSource.getRepository(GuildBuilding);
    this.playerRepo = AppDataSource.getRepository(Player);
    this.achievementService = AchievementService.getInstance();
  }

  static getInstance(): GuildService {
    if (!GuildService.instance) {
      GuildService.instance = new GuildService();
    }
    return GuildService.instance;
  }

  async createGuild(leaderId: string, name: string, description?: string, tag?: string): Promise<ServiceResult<Guild>> {
    try {
      const existing = await this.guildRepo.findOne({ where: { name } });
      if (existing) {
        return { success: false, error: '公会名称已被使用', code: 'NAME_EXISTS' };
      }

      const player = await this.playerRepo.findOne({ where: { id: leaderId } });
      if (!player) {
        return { success: false, error: '玩家不存在', code: 'PLAYER_NOT_FOUND' };
      }

      const existingMembership = await this.memberRepo.findOne({ where: { playerId: leaderId } });
      if (existingMembership) {
        return { success: false, error: '您已加入其他公会', code: 'ALREADY_IN_GUILD' };
      }

      const createCost = 10000;
      if (player.gold < createCost) {
        return { success: false, error: `创建公会需要 ${createCost} 金币`, code: 'INSUFFICIENT_GOLD' };
      }

      player.gold -= createCost;

      const guild = this.guildRepo.create({
        id: generateId(),
        name,
        description,
        tag: tag || name.substring(0, 3).toUpperCase(),
        leaderId,
        level: 1,
        gold: createCost * 0.5,
        maxMembers: 10,
        memberCount: 1,
        status: GuildStatus.ACTIVE,
      });

      const savedGuild = await this.guildRepo.save(guild);

      const leader = this.memberRepo.create({
        id: generateId(),
        guildId: savedGuild.id,
        playerId: leaderId,
        role: GuildRole.LEADER,
        joinedAt: new Date(),
      });
      await this.memberRepo.save(leader);

      await this.createDefaultBuildings(savedGuild.id);
      await this.playerRepo.save(player);
      await this.achievementService.updateProgress(leaderId, 'GUILD_CREATE', 1);

      return { success: true, data: savedGuild };
    } catch (error) {
      logger.error('Create guild error:', error);
      return { success: false, error: '创建公会失败', code: 'INTERNAL_ERROR' };
    }
  }

  private async createDefaultBuildings(guildId: string): Promise<void> {
    const buildings = [
      { type: BuildingType.TIME_TOWER, name: '时光塔', bonuses: { craftBonus: 0.02, dungeonBonus: 0.02 } },
      { type: BuildingType.RESEARCH_HALL, name: '时空研究厅', bonuses: { craftBonus: 0.01, specialEffectBonus: 0.01 } },
      { type: BuildingType.WAREHOUSE, name: '仓库', bonuses: { fragmentCapacity: 10, sandglassCapacity: 5 } },
      { type: BuildingType.WORKSHOP, name: '工坊', bonuses: { craftSpeed: 0.1 } },
      { type: BuildingType.SHRINE, name: '时光神殿', bonuses: { expBonus: 0.05 } },
    ];

    for (const b of buildings) {
      const building = this.buildingRepo.create({
        id: generateId(),
        guildId,
        type: b.type,
        name: b.name,
        level: 1,
        upgradeRequiredGold: 5000,
        upgradeRequiredMaterials: { 'time_crystal': 10, 'ancient_sand': 20 },
        bonuses: b.bonuses,
      });
      await this.buildingRepo.save(building);
    }
  }

  async joinGuild(playerId: string, guildId: string): Promise<ServiceResult<GuildMember>> {
    try {
      const guild = await this.guildRepo.findOne({ where: { id: guildId } });
      if (!guild) {
        return { success: false, error: '公会不存在', code: 'GUILD_NOT_FOUND' };
      }
      if (guild.memberCount >= guild.maxMembers) {
        return { success: false, error: '公会成员已满', code: 'GUILD_FULL' };
      }

      const existingMembership = await this.memberRepo.findOne({ where: { playerId } });
      if (existingMembership) {
        return { success: false, error: '您已加入其他公会', code: 'ALREADY_IN_GUILD' };
      }

      const member = this.memberRepo.create({
        id: generateId(),
        guildId,
        playerId,
        role: GuildRole.RECRUIT,
        joinedAt: new Date(),
      });

      guild.memberCount++;
      await this.guildRepo.save(guild);

      return { success: true, data: await this.memberRepo.save(member) };
    } catch (error) {
      logger.error('Join guild error:', error);
      return { success: false, error: '加入公会失败', code: 'INTERNAL_ERROR' };
    }
  }

  async leaveGuild(playerId: string): Promise<ServiceResult> {
    try {
      const membership = await this.memberRepo.findOne({ where: { playerId } });
      if (!membership) {
        return { success: false, error: '您未加入任何公会', code: 'NOT_IN_GUILD' };
      }
      if (membership.role === GuildRole.LEADER) {
        return { success: false, error: '公会会长不能直接离开，请先转让会长', code: 'IS_LEADER' };
      }

      const guild = await this.guildRepo.findOne({ where: { id: membership.guildId } });
      if (guild) {
        guild.memberCount--;
        await this.guildRepo.save(guild);
      }

      await this.memberRepo.remove(membership);
      return { success: true };
    } catch (error) {
      logger.error('Leave guild error:', error);
      return { success: false, error: '离开公会失败', code: 'INTERNAL_ERROR' };
    }
  }

  async contribute(playerId: string, goldAmount: number, materials: Record<string, number> = {}): Promise<ServiceResult> {
    try {
      const membership = await this.memberRepo.findOne({ where: { playerId } });
      if (!membership) {
        return { success: false, error: '您未加入任何公会', code: 'NOT_IN_GUILD' };
      }

      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      if (!player || player.gold < goldAmount) {
        return { success: false, error: '金币不足', code: 'INSUFFICIENT_GOLD' };
      }

      const guild = await this.guildRepo.findOne({ where: { id: membership.guildId } });
      if (!guild) {
        return { success: false, error: '公会不存在', code: 'GUILD_NOT_FOUND' };
      }

      const contribution = Math.floor(goldAmount * 0.1);
      player.gold -= goldAmount;
      player.guildContribution += contribution;
      guild.gold += goldAmount;
      membership.totalContribution += contribution;
      membership.weeklyContribution += contribution;

      guild.exp += Math.floor(goldAmount * 0.5);
      const expNeeded = this.getExpForGuildLevel(guild.level);
      while (guild.exp >= expNeeded) {
        guild.exp -= expNeeded;
        guild.level++;
        guild.maxMembers += 5;
        guild.craftBonus += 0.02;
        guild.dungeonBonus += 0.02;
      }

      await this.playerRepo.save(player);
      await this.guildRepo.save(guild);
      await this.memberRepo.save(membership);

      return { success: true, data: { contribution, guildLevel: guild.level } };
    } catch (error) {
      logger.error('Contribute to guild error:', error);
      return { success: false, error: '贡献失败', code: 'INTERNAL_ERROR' };
    }
  }

  async upgradeBuilding(playerId: string, buildingId: string): Promise<ServiceResult<GuildBuilding>> {
    try {
      const membership = await this.memberRepo.findOne({ where: { playerId } });
      if (!membership || ![GuildRole.LEADER, GuildRole.OFFICER].includes(membership.role)) {
        return { success: false, error: '权限不足', code: 'PERMISSION_DENIED' };
      }

      const building = await this.buildingRepo.findOne({ where: { id: buildingId } });
      if (!building) {
        return { success: false, error: '建筑不存在', code: 'BUILDING_NOT_FOUND' };
      }

      const guild = await this.guildRepo.findOne({ where: { id: building.guildId } });
      if (!guild || guild.gold < building.upgradeRequiredGold) {
        return { success: false, error: '公会金币不足', code: 'INSUFFICIENT_GOLD' };
      }

      guild.gold -= building.upgradeRequiredGold;
      building.level++;
      building.upgradeRequiredGold = Math.floor(building.upgradeRequiredGold * 1.8);
      building.upgradeProgress = 0;

      for (const key of Object.keys(building.bonuses)) {
        building.bonuses[key] = +(building.bonuses[key] * 1.15).toFixed(4);
      }

      guild.craftBonus = 1 + (await this.calculateGuildBonuses(guild.id)).craftBonus;
      guild.dungeonBonus = 1 + (await this.calculateGuildBonuses(guild.id)).dungeonBonus;

      await this.guildRepo.save(guild);
      return { success: true, data: await this.buildingRepo.save(building) };
    } catch (error) {
      logger.error('Upgrade building error:', error);
      return { success: false, error: '升级建筑失败', code: 'INTERNAL_ERROR' };
    }
  }

  private async calculateGuildBonuses(guildId: string): Promise<{ craftBonus: number; dungeonBonus: number }> {
    const buildings = await this.buildingRepo.find({ where: { guildId } });
    let craftBonus = 0;
    let dungeonBonus = 0;

    for (const b of buildings) {
      craftBonus += b.bonuses.craftBonus || 0;
      dungeonBonus += b.bonuses.dungeonBonus || 0;
    }

    return { craftBonus, dungeonBonus };
  }

  async getPlayerCraftBonus(playerId: string): Promise<number> {
    const membership = await this.memberRepo.findOne({ where: { playerId } });
    if (!membership) return 1;

    const guild = await this.guildRepo.findOne({ where: { id: membership.guildId } });
    return guild?.craftBonus || 1;
  }

  async getPlayerDungeonBonus(playerId: string): Promise<number> {
    const membership = await this.memberRepo.findOne({ where: { playerId } });
    if (!membership) return 1;

    const guild = await this.guildRepo.findOne({ where: { id: membership.guildId } });
    return guild?.dungeonBonus || 1;
  }

  async getGuildInfo(guildId: string): Promise<ServiceResult<any>> {
    try {
      const guild = await this.guildRepo.findOne({ where: { id: guildId } });
      if (!guild) {
        return { success: false, error: '公会不存在', code: 'GUILD_NOT_FOUND' };
      }

      const members = await this.memberRepo.find({ where: { guildId } });
      const buildings = await this.buildingRepo.find({ where: { guildId } });

      return {
        success: true,
        data: {
          ...guild,
          members,
          buildings,
        },
      };
    } catch (error) {
      logger.error('Get guild info error:', error);
      return { success: false, error: '获取公会信息失败', code: 'INTERNAL_ERROR' };
    }
  }

  async listGuilds(page: number = 1, pageSize: number = 20, sortBy: string = 'level'): Promise<ServiceResult<PaginatedResult<Guild>>> {
    try {
      const [items, total] = await this.guildRepo.findAndCount({
        order: { [sortBy]: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error('List guilds error:', error);
      return { success: false, error: '获取公会列表失败', code: 'INTERNAL_ERROR' };
    }
  }

  private getExpForGuildLevel(level: number): number {
    return Math.floor(10000 * Math.pow(level, 2));
  }
}
