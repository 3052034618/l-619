export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface SocketEvent {
  event: string;
  data: any;
  room?: string;
  to?: string;
}

export const QUALITY_MULTIPLIER: Record<string, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4,
  legendary: 7,
  mythical: 12,
};

export const QUALITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

export const ERA_ORDER = ['ancient', 'medieval', 'renaissance', 'modern', 'future', 'mythical'];

export const QUALITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  mythical: '#EF4444',
};

export interface CraftRecipe {
  slot1: string | null;
  slot2: string | null;
  slot3: string | null;
  slot4: string | null;
}

export interface CraftResult {
  success: boolean;
  sandglassId?: string;
  sandglassName?: string;
  rarity?: string;
  temporalControl?: number;
  specialEffectChance?: number;
  affixes?: Array<{ type: string; name: string; power: number }>;
  masteryGain?: number;
  fragmentsUsed?: string[];
  message?: string;
}

export interface AffixDefinition {
  type: string;
  name: string;
  description: string;
  basePower: number;
  baseChance: number;
  cooldown: number;
  minRarity: string;
}

export const AFFIX_DEFINITIONS: AffixDefinition[] = [
  {
    type: 'time_stop',
    name: '时间停滞',
    description: '概率冻结目标3秒',
    basePower: 30,
    baseChance: 0.08,
    cooldown: 180,
    minRarity: 'rare',
  },
  {
    type: 'time_accelerate',
    name: '加速流逝',
    description: '自身攻速和移速提升50%',
    basePower: 50,
    baseChance: 0.12,
    cooldown: 120,
    minRarity: 'uncommon',
  },
  {
    type: 'time_reversal',
    name: '时光回溯',
    description: '回溯5秒前状态',
    basePower: 100,
    baseChance: 0.05,
    cooldown: 300,
    minRarity: 'epic',
  },
  {
    type: 'time_dilation',
    name: '时间膨胀',
    description: '扩大时间场覆盖范围',
    basePower: 40,
    baseChance: 0.1,
    cooldown: 90,
    minRarity: 'rare',
  },
  {
    type: 'time_shield',
    name: '时光护盾',
    description: '生成护盾抵挡伤害',
    basePower: 60,
    baseChance: 0.15,
    cooldown: 60,
    minRarity: 'uncommon',
  },
  {
    type: 'temporal_burst',
    name: '时空爆发',
    description: '释放时空能量造成AOE伤害',
    basePower: 80,
    baseChance: 0.07,
    cooldown: 150,
    minRarity: 'epic',
  },
  {
    type: 'paradox',
    name: '时间悖论',
    description: '复制自身一个幻象',
    basePower: 70,
    baseChance: 0.03,
    cooldown: 240,
    minRarity: 'legendary',
  },
  {
    type: 'eternity',
    name: '永恒之境',
    description: '进入无敌状态5秒',
    basePower: 120,
    baseChance: 0.02,
    cooldown: 600,
    minRarity: 'mythical',
  },
];
