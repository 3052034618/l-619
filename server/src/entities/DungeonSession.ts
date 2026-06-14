import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Dungeon } from './Dungeon';
import { Player } from './Player';

export enum DungeonSessionStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
}

export interface PlayerPosition {
  playerId: string;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
}

export interface CollectedFragment {
  id: string;
  name: string;
  quality: string;
  era: string;
  collectedBy: string;
  collectedAt: Date;
}

export interface DungeonEvent {
  id: string;
  type: 'time_storm' | 'correction' | 'rift_open' | 'boss_spawn' | 'reward';
  timestamp: Date;
  data: Record<string, any>;
}

@Entity('dungeon_sessions')
@Index(['dungeonId', 'status'])
export class DungeonSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dungeon, dungeon => dungeon.sessions)
  @JoinColumn()
  dungeon: Dungeon;

  @Column({ type: 'uuid' })
  dungeonId: string;

  @Column({ type: 'uuid', array: true, default: [] })
  playerIds: string[];

  @Column({ type: 'uuid' })
  leaderId: string;

  @Column({ type: 'enum', enum: DungeonSessionStatus, default: DungeonSessionStatus.WAITING })
  status: DungeonSessionStatus;

  @Column({ type: 'int', default: 0, comment: '当前时间余额（秒）' })
  timeBalance: number;

  @Column({ type: 'int', default: 100, comment: '当前时间流速倍率' })
  currentTimeFlowRate: number;

  @Column({ type: 'jsonb', default: [] })
  playerPositions: PlayerPosition[];

  @Column({ type: 'jsonb', default: [] })
  collectedFragments: CollectedFragment[];

  @Column({ type: 'int', default: 0, comment: '碎片回收进度百分比' })
  fragmentProgress: number;

  @Column({ type: 'jsonb', default: [] })
  events: DungeonEvent[];

  @Column({ type: 'jsonb', default: {} })
  rewards: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'int', default: 0, comment: '实际耗时（秒）' })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
