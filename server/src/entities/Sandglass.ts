import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Player } from './Player';
import { PlayerInventory } from './PlayerInventory';

export enum SandglassRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHICAL = 'mythical',
}

export enum SandglassAffixType {
  TIME_STOP = 'time_stop',
  TIME_ACCELERATE = 'time_accelerate',
  TIME_REVERSAL = 'time_reversal',
  TIME_DILATION = 'time_dilation',
  TIME_SHIELD = 'time_shield',
  TEMPORAL_BURST = 'temporal_burst',
  PARADOX = 'paradox',
  ETERNITY = 'eternity',
}

export interface SandglassAffix {
  type: SandglassAffixType;
  name: string;
  description: string;
  power: number;
  triggerChance: number;
  cooldown: number;
}

@Entity('sandglasses')
@Index(['ownerId', 'rarity'])
export class Sandglass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Player, player => player.sandglasses)
  @JoinColumn()
  owner: Player;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => PlayerInventory, inventory => inventory.sandglasses, { nullable: true })
  @JoinColumn()
  inventory: PlayerInventory;

  @Column({ type: 'uuid', nullable: true })
  inventoryId: string | null;

  @Column({ type: 'enum', enum: SandglassRarity, default: SandglassRarity.COMMON })
  rarity: SandglassRarity;

  @Column({ type: 'int', default: 0, comment: '时光掌控力' })
  temporalControl: number;

  @Column({ type: 'float', default: 0, comment: '特殊效果触发概率 0-1' })
  specialEffectChance: number;

  @Column({ type: 'int', default: 100, comment: '使用次数上限' })
  maxUses: number;

  @Column({ type: 'int', default: 100, comment: '剩余使用次数' })
  remainingUses: number;

  @Column({ type: 'int', default: 0, comment: '使用等级要求' })
  requiredLevel: number;

  @Column({ type: 'jsonb', default: [] })
  affixes: SandglassAffix[];

  @Column({ type: 'jsonb', default: {}, comment: '基础属性：攻击、防御、速度等' })
  baseStats: Record<string, number>;

  @Column({ type: 'uuid', array: true, default: [] })
  fragmentIds: string[];

  @Column({ type: 'jsonb', default: {} })
  fragmentDetails: Record<string, any>;

  @Column({ type: 'int', default: 0, comment: '合成时的工匠熟练度' })
  craftMasteryUsed: number;

  @Column({ type: 'int', default: 0, comment: '收藏价值' })
  collectionValue: number;

  @Column({ type: 'boolean', default: false })
  isListed: boolean;

  @Column({ type: 'boolean', default: false, comment: '是否收藏，收藏的沙漏排在前面' })
  isFavorite: boolean;

  @Column({ type: 'boolean', default: false, comment: '是否锁定，锁定后不能上架或消耗' })
  isLocked: boolean;

  @Column({ type: 'bigint', default: 0, comment: '出售价格' })
  listedPrice: number;

  @Column({ type: 'int', default: 0, comment: '总使用次数' })
  totalUsed: number;

  @Column({ type: 'int', default: 0, comment: 'PVP击杀数' })
  pvpKills: number;

  @Column({ type: 'int', default: 0, comment: '副本通关数' })
  dungeonClears: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
