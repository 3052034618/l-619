import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export interface HeatmapDataPoint {
  era: string;
  dungeonId: string;
  dungeonName: string;
  plays: number;
  clears: number;
  avgTime: number;
}

export interface CraftSuccessRatePoint {
  quality: string;
  attempts: number;
  successes: number;
  rate: number;
}

export interface PriceTrendPoint {
  date: string;
  avgPrice: number;
  volume: number;
}

export interface RadarData {
  temporalControl: number;
  specialEffect: number;
  pvpPower: number;
  collectionValue: number;
  dungeonEfficiency: number;
}

@Entity('weekly_reports')
export class WeeklyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  weekNumber: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'jsonb', default: [], comment: '各时代副本热度热力图数据' })
  dungeonHeatmap: HeatmapDataPoint[];

  @Column({ type: 'jsonb', default: [], comment: '合成成功率曲线数据' })
  craftSuccessRates: CraftSuccessRatePoint[];

  @Column({ type: 'jsonb', default: {}, comment: '各品质碎片交易价格走势' })
  priceTrends: Record<string, PriceTrendPoint[]>;

  @Column({ type: 'jsonb', default: {}, comment: '全服时光能量雷达图数据' })
  temporalRadar: RadarData;

  @Column({ type: 'int', default: 0, comment: '本周总合成次数' })
  totalCrafts: number;

  @Column({ type: 'int', default: 0, comment: '本周总合成成功次数' })
  totalCraftSuccesses: number;

  @Column({ type: 'int', default: 0, comment: '本周副本总探索次数' })
  totalDungeonRuns: number;

  @Column({ type: 'int', default: 0, comment: '本周联赛总场次' })
  totalLeagueMatches: number;

  @Column({ type: 'int', default: 0, comment: '本周总交易额' })
  totalTradeVolume: number;

  @Column({ type: 'int', default: 0, comment: '本周活跃玩家数' })
  activePlayers: number;

  @Column({ type: 'jsonb', default: [], comment: '本周最佳沙漏排行' })
  topSandglasses: Array<{
    id: string;
    name: string;
    ownerName: string;
    rarity: string;
    temporalControl: number;
    collectionValue: number;
  }>;

  @Column({ type: 'jsonb', default: [], comment: '本周最佳玩家排行' })
  topPlayers: Array<{
    id: string;
    name: string;
    level: number;
    points: number;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}
