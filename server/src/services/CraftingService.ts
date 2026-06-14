import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Player } from '../entities/Player';
import { Fragment, FragmentQuality, FragmentEra } from '../entities/Fragment';
import { Sandglass, SandglassRarity, SandglassAffix } from '../entities/Sandglass';
import { PlayerInventory } from '../entities/PlayerInventory';
import { logger } from '../utils/logger';
import { generateId, randomInt, randomFloat, randomChoice, weightedRandomChoice, clamp, getQualityIndex, getQualityMultiplier, calculateRarityFromScore, calculateMasteryLevel } from '../utils';
import { CraftRecipe, CraftResult, AFFIX_DEFINITIONS, ServiceResult } from '../types';
import { redisClient } from '../config/redis';
import { AchievementService } from './AchievementService';
import { GuildService } from './GuildService';

export class CraftingService {
  private static instance: CraftingService;
  private playerRepo: Repository<Player>;
  private fragmentRepo: Repository<Fragment>;
  private sandglassRepo: Repository<Sandglass>;
  private inventoryRepo: Repository<PlayerInventory>;
  private guildService: GuildService;
  private achievementService: AchievementService;

  private constructor() {
    this.playerRepo = AppDataSource.getRepository(Player);
    this.fragmentRepo = AppDataSource.getRepository(Fragment);
    this.sandglassRepo = AppDataSource.getRepository(Sandglass);
    this.inventoryRepo = AppDataSource.getRepository(PlayerInventory);
    this.guildService = GuildService.getInstance();
    this.achievementService = AchievementService.getInstance();
  }

  static getInstance(): CraftingService {
    if (!CraftingService.instance) {
      CraftingService.instance = new CraftingService();
    }
    return CraftingService.instance;
  }

  async craftSandglass(playerId: string, recipe: CraftRecipe): Promise<ServiceResult<CraftResult>> {
    try {
      const slotIds = [recipe.slot1, recipe.slot2, recipe.slot3, recipe.slot4].filter(Boolean) as string[];
      
      if (slotIds.length < 2) {
        return { success: false, error: '至少需要2个碎片才能合成沙漏', code: 'INSUFFICIENT_FRAGMENTS' };
      }

      const player = await this.playerRepo.findOne({ where: { id: playerId } });
      if (!player) {
        return { success: false, error: '玩家不存在', code: 'PLAYER_NOT_FOUND' };
      }

      const inventory = await this.inventoryRepo.findOne({
        where: { playerId },
        relations: ['fragments'],
      });
      if (!inventory) {
        return { success: false, error: '背包不存在', code: 'INVENTORY_NOT_FOUND' };
      }

      const fragments = inventory.fragments.filter(f => slotIds.includes(f.id));
      if (fragments.length !== slotIds.length) {
        return { success: false, error: '部分碎片不存在或不在背包中', code: 'FRAGMENT_MISSING' };
      }

      for (const frag of fragments) {
        if (frag.isListed) {
          return { success: false, error: '碎片正在出售中，无法使用', code: 'FRAGMENT_LISTED' };
        }
      }

      const craftCost = this.calculateCraftCost(fragments.length);
      if (player.gold < craftCost) {
        return { success: false, error: `金币不足，需要 ${craftCost} 金币`, code: 'INSUFFICIENT_GOLD' };
      }

      const craftBonus = await this.guildService.getPlayerCraftBonus(playerId);
      const masteryLevel = calculateMasteryLevel(player.craftMastery);
      const successRate = this.calculateSuccessRate(fragments, masteryLevel, craftBonus);

      const isSuccess = Math.random() < successRate;

      player.gold -= craftCost;
      await this.playerRepo.save(player);

      let masteryGain = Math.floor(craftCost * 0.1);
      let result: CraftResult;

      if (isSuccess) {
        result = await this.createSandglass(player, inventory, fragments);
        masteryGain = Math.floor(masteryGain * 2);
        await this.fragmentRepo.remove(fragments);
        await this.achievementService.updateProgress(playerId, 'CRAFT_SUCCESS', 1);
      } else {
        const retainedFragments = this.selectRetainedFragments(fragments);
        const removedFragments = fragments.filter(f => !retainedFragments.includes(f));
        if (removedFragments.length > 0) {
          await this.fragmentRepo.remove(removedFragments);
        }
        result = {
          success: false,
          message: `合成失败！成功率: ${(successRate * 100).toFixed(1)}%。保留了 ${retainedFragments.length} 个碎片。`,
          fragmentsUsed: slotIds,
          masteryGain,
        };
      }

      player.craftMastery += masteryGain;
      result.masteryGain = masteryGain;
      await this.playerRepo.save(player);

      await this.achievementService.updateProgress(playerId, 'CRAFT_TOTAL', 1);
      await this.recordCraftStats(playerId, isSuccess, fragments);

      return { success: true, data: result };
    } catch (error) {
      logger.error('Craft sandglass error:', error);
      return { success: false, error: '合成失败，请稍后重试', code: 'INTERNAL_ERROR' };
    }
  }

  private calculateCraftCost(fragmentCount: number): number {
    const baseCost = 100;
    return baseCost * fragmentCount * (fragmentCount + 1) / 2;
  }

  private calculateSuccessRate(fragments: Fragment[], masteryLevel: number, guildBonus: number): number {
    let baseRate = 0.5;

    const avgQualityIndex = fragments.reduce((sum, f) => sum + getQualityIndex(f.quality), 0) / fragments.length;
    baseRate += (0.08 * avgQualityIndex);

    baseRate += (0.03 * masteryLevel);
    baseRate += (guildBonus - 1);

    if (fragments.length === 4) {
      baseRate += 0.05;
      const eras = fragments.map(f => f.era);
      if (new Set(eras).size === 1) {
        baseRate += 0.08;
      }
      const positions = fragments.map(f => f.slotPosition).sort();
      const isOrdered = positions.every((p, i) => p === i + 1);
      if (isOrdered) {
        baseRate += 0.05;
      }
    }

    return clamp(baseRate, 0.1, 0.95);
  }

  private selectRetainedFragments(fragments: Fragment[]): Fragment[] {
    const shuffled = [...fragments].sort(() => Math.random() - 0.5);
    const retainCount = Math.ceil(shuffled.length * 0.5);
    return shuffled.slice(0, retainCount);
  }

  private async createSandglass(player: Player, inventory: PlayerInventory, fragments: Fragment[]): Promise<CraftResult> {
    const totalEnergy = fragments.reduce((sum, f) => sum + f.temporalEnergy, 0);
    const qualityScore = fragments.reduce((sum, f) => sum + getQualityMultiplier(f.quality) * 100, 0);
    const masteryBonus = calculateMasteryLevel(player.craftMastery) * 20;
    const finalScore = totalEnergy + qualityScore + masteryBonus;

    const rarity = calculateRarityFromScore(finalScore);
    const temporalControl = Math.floor(finalScore * randomFloat(0.9, 1.1));
    const specialEffectChance = clamp(
      0.05 + getQualityIndex(rarity) * 0.08 + fragments.length * 0.02,
      0.05,
      0.95
    );

    const affixes = this.rollAffixes(fragments, rarity);
    const name = this.generateSandglassName(fragments, rarity);
    const baseStats = this.calculateBaseStats(fragments, rarity);
    const collectionValue = this.calculateCollectionValue(fragments, rarity, affixes);

    const sandglass = this.sandglassRepo.create({
      id: generateId(),
      name,
      owner: player,
      ownerId: player.id,
      inventory,
      inventoryId: inventory.id,
      rarity: rarity as SandglassRarity,
      temporalControl,
      specialEffectChance,
      maxUses: 50 + getQualityIndex(rarity) * 50,
      remainingUses: 50 + getQualityIndex(rarity) * 50,
      requiredLevel: Math.max(1, getQualityIndex(rarity) * 10),
      affixes: affixes as SandglassAffix[],
      baseStats,
      fragmentIds: fragments.map(f => f.id),
      fragmentDetails: fragments.map(f => ({
        id: f.id,
        name: f.name,
        quality: f.quality,
        era: f.era,
      })),
      craftMasteryUsed: player.craftMastery,
      collectionValue,
    });

    const saved = await this.sandglassRepo.save(sandglass);

    player.collectionScore += Math.floor(collectionValue * 0.1);

    return {
      success: true,
      sandglassId: saved.id,
      sandglassName: name,
      rarity,
      temporalControl,
      specialEffectChance,
      affixes: affixes.map(a => ({ type: a.type, name: a.name, power: a.power })),
      fragmentsUsed: fragments.map(f => f.id),
      message: `合成成功！获得 [${this.getQualityLabel(rarity)}] ${name}`,
    };
  }

  private rollAffixes(fragments: Fragment[], rarity: string): SandglassAffix[] {
    const affixes: SandglassAffix[] = [];
    const rarityIndex = getQualityIndex(rarity);
    const maxAffixes = Math.min(1 + Math.floor(rarityIndex / 2), 4);
    const availableAffixes = AFFIX_DEFINITIONS.filter(a => getQualityIndex(a.minRarity) <= rarityIndex);

    if (availableAffixes.length === 0) return affixes;

    const affixCount = weightedRandomChoice(
      [0, 1, 2, 3, maxAffixes],
      [30, 40, 15, 10, 5]
    );

    if (affixCount === 0) return affixes;

    const shuffled = [...availableAffixes].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(affixCount, availableAffixes.length));

    for (const def of selected) {
      const power = Math.floor(def.basePower * (1 + rarityIndex * 0.3) * randomFloat(0.8, 1.2));
      const chance = clamp(def.baseChance * (1 + rarityIndex * 0.15), 0.01, 0.5);
      affixes.push({
        type: def.type as any,
        name: def.name,
        description: def.description,
        power,
        triggerChance: chance,
        cooldown: def.cooldown,
      });
    }

    return affixes;
  }

  private generateSandglassName(fragments: Fragment[], rarity: string): string {
    const eraNames: Record<string, string> = {
      ancient: '远古',
      medieval: '中世纪',
      renaissance: '复兴',
      modern: '近代',
      future: '未来',
      mythical: '神话',
    };

    const prefixes = fragments.length >= 3
      ? ['时光', '命运', '永恒', '星辰', '虚空', '混沌']
      : ['普通', '基础', '初级', '简易'];

    const suffixes: Record<string, string[]> = {
      common: ['沙漏'],
      uncommon: ['沙漏', '时计'],
      rare: ['之砂', '之心'],
      epic: ['之瞳', '之核'],
      legendary: ['圣遗物', '神器'],
      mythical: ['本源', '奇点'],
    };

    const mainEra = this.getDominantEra(fragments);
    const prefix = randomChoice(prefixes);
    const suffix = randomChoice(suffixes[rarity] || ['沙漏']);
    const eraPart = eraNames[mainEra] || '';

    return `${prefix}${eraPart}${suffix}`;
  }

  private getDominantEra(fragments: Fragment[]): string {
    const eraCount: Record<string, number> = {};
    for (const f of fragments) {
      eraCount[f.era] = (eraCount[f.era] || 0) + 1;
    }
    return Object.entries(eraCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ancient';
  }

  private calculateBaseStats(fragments: Fragment[], rarity: string): Record<string, number> {
    const rarityMul = getQualityMultiplier(rarity);
    let totalAtk = 0, totalDef = 0, totalSpd = 0, totalHp = 0;

    for (const f of fragments) {
      const qMul = getQualityMultiplier(f.quality);
      totalAtk += (f.attributes.attack || 0) * qMul;
      totalDef += (f.attributes.defense || 0) * qMul;
      totalSpd += (f.attributes.speed || 0) * qMul;
      totalHp += (f.attributes.hp || 0) * qMul;
    }

    return {
      attack: Math.floor(totalAtk * rarityMul),
      defense: Math.floor(totalDef * rarityMul),
      speed: Math.floor(totalSpd * rarityMul),
      hp: Math.floor(totalHp * rarityMul),
    };
  }

  private calculateCollectionValue(fragments: Fragment[], rarity: string, affixes: SandglassAffix[]): number {
    let value = fragments.reduce((sum, f) => sum + getQualityMultiplier(f.quality) * 50, 0);
    value += getQualityMultiplier(rarity) * 200;
    value += affixes.reduce((sum, a) => sum + a.power, 0) * 2;
    return Math.floor(value);
  }

  private getQualityLabel(rarity: string): string {
    const labels: Record<string, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
      mythical: '神话',
    };
    return labels[rarity] || rarity;
  }

  private async recordCraftStats(playerId: string, success: boolean, fragments: Fragment[]): Promise<void> {
    try {
      const dateKey = new Date().toISOString().split('T')[0];
      const quality = this.getDominantQuality(fragments);

      await redisClient.hincrby(`craft:stats:${dateKey}`, success ? 'success' : 'fail', 1);
      await redisClient.hincrby(`craft:stats:${dateKey}:quality`, quality, 1);
      await redisClient.hincrby(`craft:player:${playerId}:${dateKey}`, success ? 'success' : 'fail', 1);
    } catch (error) {
      logger.warn('Failed to record craft stats:', error);
    }
  }

  private getDominantQuality(fragments: Fragment[]): string {
    const count: Record<string, number> = {};
    for (const f of fragments) {
      count[f.quality] = (count[f.quality] || 0) + 1;
    }
    return Object.entries(count).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return getQualityIndex(b[0]) - getQualityIndex(a[0]);
    })[0]?.[0] || 'common';
  }

  async getCraftHistory(playerId: string, page: number = 1, pageSize: number = 20): Promise<any> {
    const key = `craft:player:${playerId}:history`;
    const cached = await redisClient.lrange(key, (page - 1) * pageSize, page * pageSize - 1);
    return cached.map(c => JSON.parse(c));
  }

  async getCraftStats(startDate?: string, endDate?: string): Promise<any> {
    const stats: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];
    const data = await redisClient.hgetall(`craft:stats:${today}`);
    stats[today] = data;
    return stats;
  }
}
