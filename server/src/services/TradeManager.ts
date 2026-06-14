import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Trade, TradeStatus, TradeItemType } from '../entities/Trade';
import { Player } from '../entities/Player';
import { Fragment } from '../entities/Fragment';
import { Sandglass } from '../entities/Sandglass';
import { PlayerInventory } from '../entities/PlayerInventory';
import { logger } from '../utils/logger';
import { generateId, randomFloat } from '../utils';
import { ServiceResult, PaginatedResult } from '../types';
import { redisClient } from '../config/redis';
import { Server } from 'socket.io';
import { DungeonManager } from './DungeonManager';
import { AchievementService } from './AchievementService';

export class TradeManager {
  private static instance: TradeManager;
  private tradeRepo: Repository<Trade>;
  private playerRepo: Repository<Player>;
  private fragmentRepo: Repository<Fragment>;
  private sandglassRepo: Repository<Sandglass>;
  private inventoryRepo: Repository<PlayerInventory>;
  private achievementService: AchievementService;
  private dungeonManager: DungeonManager;
  private io: Server | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.tradeRepo = AppDataSource.getRepository(Trade);
    this.playerRepo = AppDataSource.getRepository(Player);
    this.fragmentRepo = AppDataSource.getRepository(Fragment);
    this.sandglassRepo = AppDataSource.getRepository(Sandglass);
    this.inventoryRepo = AppDataSource.getRepository(PlayerInventory);
    this.achievementService = AchievementService.getInstance();
    this.dungeonManager = DungeonManager.getInstance();
  }

  static getInstance(): TradeManager {
    if (!TradeManager.instance) {
      TradeManager.instance = new TradeManager();
    }
    return TradeManager.instance;
  }

  setSocketServer(io: Server): void {
    this.io = io;
  }

  start(): void {
    this.checkInterval = setInterval(() => this.checkExpiredTrades(), 60000);
    logger.info('TradeManager started');
  }

  stop(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  async listItem(
    sellerId: string,
    itemType: TradeItemType,
    itemId: string,
    price: number
  ): Promise<ServiceResult<Trade>> {
    try {
      const seller = await this.playerRepo.findOne({ where: { id: sellerId } });
      if (!seller) return { success: false, error: '玩家不存在', code: 'PLAYER_NOT_FOUND' };
      if (price <= 0) return { success: false, error: '价格必须大于0', code: 'INVALID_PRICE' };

      let item: Fragment | Sandglass | null = null;
      let itemName: string = '';
      let itemEra: string = '';
      let itemQuality: string = '';
      let itemDetails: Record<string, any> = {};

      if (itemType === TradeItemType.FRAGMENT) {
        item = await this.fragmentRepo.findOne({
          where: { id: itemId, inventoryId: (await this.getInventoryId(sellerId)) as any },
        });
        if (!item) return { success: false, error: '碎片不存在或不属于你', code: 'ITEM_NOT_FOUND' };
        if (item.isListed) return { success: false, error: '该碎片已在出售中', code: 'ALREADY_LISTED' };
        itemName = item.name;
        itemEra = item.era;
        itemQuality = item.quality;
        itemDetails = { attributes: item.attributes, temporalEnergy: item.temporalEnergy };
      } else {
        item = await this.sandglassRepo.findOne({
          where: { id: itemId, ownerId: sellerId },
        });
        if (!item) return { success: false, error: '沙漏不存在或不属于你', code: 'ITEM_NOT_FOUND' };
        if (item.isListed) return { success: false, error: '该沙漏已在出售中', code: 'ALREADY_LISTED' };
        itemName = item.name;
        itemEra = (item.fragmentDetails as any)?.[0]?.era || 'unknown';
        itemQuality = item.rarity;
        itemDetails = {
          rarity: item.rarity,
          temporalControl: item.temporalControl,
          specialEffectChance: item.specialEffectChance,
          affixes: item.affixes,
          remainingUses: item.remainingUses,
        };
      }

      const avg7dPrice = await this.getAvg7dPrice(itemType, itemQuality, itemEra);
      const suggestedPrice = await this.getSuggestedPrice(itemType, itemQuality, itemEra);
      const timeRippleStrength = this.calculateRippleStrength(price, avg7dPrice, itemQuality);

      const trade = this.tradeRepo.create({
        id: generateId(),
        sellerId,
        sellerName: seller.nickname || seller.username,
        itemType,
        itemId,
        itemName,
        itemEra,
        itemQuality,
        itemDetails,
        price,
        suggestedPrice,
        avg7dPrice,
        status: TradeStatus.LISTED,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        timeRippleStrength,
      });

      const saved = await this.tradeRepo.save(trade);

      if (itemType === TradeItemType.FRAGMENT) {
        await this.fragmentRepo.update(itemId, { isListed: true });
      } else {
        await this.sandglassRepo.update(itemId, { isListed: true });
      }

      return { success: true, data: saved };
    } catch (error) {
      logger.error('List item error:', error);
      return { success: false, error: '上架失败', code: 'INTERNAL_ERROR' };
    }
  }

  async cancelListing(sellerId: string, tradeId: string): Promise<ServiceResult> {
    try {
      const trade = await this.tradeRepo.findOne({ where: { id: tradeId, status: TradeStatus.LISTED } });
      if (!trade) return { success: false, error: '交易不存在或已完成', code: 'TRADE_NOT_FOUND' };
      if (trade.sellerId !== sellerId) return { success: false, error: '无权限取消', code: 'PERMISSION_DENIED' };

      trade.status = TradeStatus.CANCELLED;
      await this.tradeRepo.save(trade);

      if (trade.itemType === TradeItemType.FRAGMENT) {
        await this.fragmentRepo.update(trade.itemId, { isListed: false });
      } else {
        await this.sandglassRepo.update(trade.itemId, { isListed: false });
      }

      return { success: true };
    } catch (error) {
      logger.error('Cancel listing error:', error);
      return { success: false, error: '取消失败', code: 'INTERNAL_ERROR' };
    }
  }

  async buyItem(buyerId: string, tradeId: string): Promise<ServiceResult<Trade>> {
    try {
      const trade = await this.tradeRepo.findOne({ where: { id: tradeId, status: TradeStatus.LISTED } });
      if (!trade) return { success: false, error: '交易不存在或已完成', code: 'TRADE_NOT_FOUND' };
      if (trade.sellerId === buyerId) return { success: false, error: '不能购买自己的物品', code: 'CANNOT_BUY_OWN' };

      const buyer = await this.playerRepo.findOne({ where: { id: buyerId } });
      if (!buyer) return { success: false, error: '买家不存在', code: 'BUYER_NOT_FOUND' };
      if (buyer.gold < trade.price) return { success: false, error: '金币不足', code: 'INSUFFICIENT_GOLD' };

      const seller = await this.playerRepo.findOne({ where: { id: trade.sellerId } });
      if (!seller) return { success: false, error: '卖家不存在', code: 'SELLER_NOT_FOUND' };

      const buyerInventoryId = await this.getInventoryId(buyerId);
      const sellerInventoryId = await this.getInventoryId(trade.sellerId);

      if (trade.itemType === TradeItemType.FRAGMENT) {
        const fragment = await this.fragmentRepo.findOne({ where: { id: trade.itemId, inventoryId: sellerInventoryId as any } });
        if (!fragment) return { success: false, error: '碎片不存在', code: 'ITEM_NOT_FOUND' };
        fragment.inventoryId = buyerInventoryId;
        fragment.isListed = false;
        await this.fragmentRepo.save(fragment);
      } else {
        const sandglass = await this.sandglassRepo.findOne({ where: { id: trade.itemId, ownerId: trade.sellerId } });
        if (!sandglass) return { success: false, error: '沙漏不存在', code: 'ITEM_NOT_FOUND' };
        sandglass.ownerId = buyerId;
        sandglass.inventoryId = buyerInventoryId;
        sandglass.isListed = false;
        await this.sandglassRepo.save(sandglass);
      }

      const fee = Math.floor(trade.price * 0.05);
      buyer.gold -= trade.price;
      seller.gold += (trade.price - fee);

      trade.status = TradeStatus.SOLD;
      trade.buyerId = buyerId;
      trade.buyerName = buyer.nickname || buyer.username;
      trade.soldAt = new Date();

      await this.playerRepo.save([buyer, seller]);
      await this.tradeRepo.save(trade);

      await this.recordTradePrice(trade);
      await this.triggerTimeRipple(trade);
      await this.achievementService.updateProgress(buyerId, 'TRADE_BUY', 1);
      await this.achievementService.updateProgress(trade.sellerId, 'TRADE_SELL', 1);

      if (this.io) {
        this.io.emit('trade:announcement', {
          message: `🎉 ${buyer.nickname || buyer.username} 购买了 ${trade.itemName}！交易金额: ${trade.price} 金币`,
          tradeId: trade.id,
          itemName: trade.itemName,
          price: trade.price,
          rippleStrength: trade.timeRippleStrength,
        });
      }

      return { success: true, data: trade };
    } catch (error) {
      logger.error('Buy item error:', error);
      return { success: false, error: '购买失败', code: 'INTERNAL_ERROR' };
    }
  }

  private async getInventoryId(playerId: string): Promise<string | null> {
    const inventory = await this.inventoryRepo.findOne({ where: { playerId } });
    return inventory?.id || null;
  }

  async getSuggestedPrice(itemType: TradeItemType, quality: string, era: string): Promise<number> {
    const key = `price:suggested:${itemType}:${quality}:${era}`;
    const cached = await redisClient.get(key);
    if (cached) return parseInt(cached);

    const avg = await this.getAvg7dPrice(itemType, quality, era);
    const suggested = avg > 0 ? Math.floor(avg * randomFloat(0.9, 1.1)) : this.getBasePrice(itemType, quality);

    await redisClient.setex(key, 3600, suggested.toString());
    return suggested;
  }

  async getAvg7dPrice(itemType: TradeItemType, quality: string, era: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trades = await this.tradeRepo.find({
      where: {
        itemType,
        itemQuality: quality,
        itemEra: era,
        status: TradeStatus.SOLD,
        soldAt: Between(sevenDaysAgo, new Date()),
      },
      select: ['price'],
    });

    if (trades.length === 0) return 0;
    return Math.floor(trades.reduce((sum, t) => sum + Number(t.price), 0) / trades.length);
  }

  private getBasePrice(itemType: TradeItemType, quality: string): number {
    const qualityMul: Record<string, number> = {
      common: 1, uncommon: 3, rare: 10, epic: 50, legendary: 300, mythical: 2000,
    };
    const base = itemType === TradeItemType.FRAGMENT ? 100 : 1000;
    return base * (qualityMul[quality] || 1);
  }

  private calculateRippleStrength(price: number, avgPrice: number, quality: string): number {
    if (avgPrice === 0) return 0.1;
    const ratio = price / avgPrice;
    const qualityBonus: Record<string, number> = {
      common: 0.05, uncommon: 0.1, rare: 0.2, epic: 0.4, legendary: 0.7, mythical: 1.0,
    };
    const base = Math.min(1, Math.abs(1 - ratio) * 0.5 + 0.1);
    return Math.min(1, base * (qualityBonus[quality] || 0.1));
  }

  private async recordTradePrice(trade: Trade): Promise<void> {
    const dateKey = new Date().toISOString().split('T')[0];
    const key = `price:history:${trade.itemType}:${trade.itemQuality}:${trade.itemEra}:${dateKey}`;
    await redisClient.hincrby(key, 'total', Number(trade.price));
    await redisClient.hincrby(key, 'count', 1);
    await redisClient.expire(key, 8 * 24 * 60 * 60);
  }

  private async triggerTimeRipple(trade: Trade): Promise<void> {
    if (trade.timeRippleStrength < 0.3) return;

    const refreshMul = 1 + trade.timeRippleStrength * 0.5;
    const rareMul = 1 + trade.timeRippleStrength * 0.8;

    const currentEffect = await redisClient.get('dungeon:ripple_effect');
    if (currentEffect) {
      const parsed = JSON.parse(currentEffect);
      parsed.refreshMul = Math.max(parsed.refreshMul, refreshMul);
      parsed.rareMul = Math.max(parsed.rareMul, rareMul);
      parsed.expiresAt = Date.now() + 3600000;
      await redisClient.set('dungeon:ripple_effect', JSON.stringify(parsed), 'EX', 3600);
    } else {
      await redisClient.set(
        'dungeon:ripple_effect',
        JSON.stringify({ refreshMul, rareMul, expiresAt: Date.now() + 3600000 }),
        'EX',
        3600
      );
    }

    this.dungeonManager.setRippleEffect(refreshMul, rareMul);

    if (this.io) {
      this.io.emit('dungeon:time_ripple', {
        message: `⚡ 时间涟漪扩散！全服副本刷新率 +${Math.floor((refreshMul - 1) * 100)}%，稀有事件概率 +${Math.floor((rareMul - 1) * 100)}%`,
        refreshMul,
        rareMul,
        duration: 3600,
      });
    }

    logger.info(`Time ripple triggered: refresh=${refreshMul}x, rare=${rareMul}x`);
  }

  private async checkExpiredTrades(): Promise<void> {
    try {
      const now = new Date();
      const expired = await this.tradeRepo.find({
        where: { status: TradeStatus.LISTED },
      });

      for (const trade of expired) {
        if (trade.expiresAt < now) {
          trade.status = TradeStatus.EXPIRED;
          await this.tradeRepo.save(trade);

          if (trade.itemType === TradeItemType.FRAGMENT) {
            await this.fragmentRepo.update(trade.itemId, { isListed: false });
          } else {
            await this.sandglassRepo.update(trade.itemId, { isListed: false });
          }
        }
      }
    } catch (error) {
      logger.error('Check expired trades error:', error);
    }
  }

  async listTrades(
    itemType?: TradeItemType,
    quality?: string,
    era?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    page: number = 1,
    pageSize: number = 20,
    minPrice?: number,
    maxPrice?: number
  ): Promise<ServiceResult<PaginatedResult<any>>> {
    try {
      const query = this.tradeRepo.createQueryBuilder('t').where('t.status = :status', { status: TradeStatus.LISTED });

      if (itemType) query.andWhere('t.itemType = :itemType', { itemType });
      if (quality) query.andWhere('t.itemQuality = :quality', { quality });
      if (era) query.andWhere('t.itemEra = :era', { era });
      if (minPrice) query.andWhere('t.price >= :minPrice', { minPrice });
      if (maxPrice) query.andWhere('t.price <= :maxPrice', { maxPrice });

      query.orderBy(`t.${sortBy}`, sortOrder);
      query.skip((page - 1) * pageSize);
      query.take(pageSize);

      const [items, total] = await query.getManyAndCount();

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
      logger.error('List trades error:', error);
      return { success: false, error: '获取交易列表失败', code: 'INTERNAL_ERROR' };
    }
  }

  async getPriceTrend(itemType: TradeItemType, quality: string, era: string, days: number = 7): Promise<ServiceResult<any[]>> {
    try {
      const trend: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const key = `price:history:${itemType}:${quality}:${era}:${date}`;
        const data = await redisClient.hgetall(key);
        if (data && data.total && data.count) {
          trend.push({
            date,
            avgPrice: Math.floor(Number(data.total) / Number(data.count)),
            volume: Number(data.count),
          });
        } else {
          trend.push({ date, avgPrice: 0, volume: 0 });
        }
      }
      return { success: true, data: trend };
    } catch (error) {
      logger.error('Get price trend error:', error);
      return { success: false, error: '获取价格走势失败' };
    }
  }
}
