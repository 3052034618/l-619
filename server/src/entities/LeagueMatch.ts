import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum MatchStatus {
  MATCHING = 'matching',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface LeaguePlayer {
  id: string;
  name: string;
  avatar: string;
  level: number;
  sandglassId: string;
  sandglassName: string;
  sandglassRarity: string;
  temporalControl: number;
  hp: number;
  maxHp: number;
  timeFieldCoverage: number;
  remainingTime: number;
  skills: Array<{
    id: string;
    name: string;
    cooldown: number;
    maxCooldown: number;
    ready: boolean;
  }>;
  counters: Array<{
    id: string;
    name: string;
    active: boolean;
    duration: number;
  }>;
}

@Entity('league_matches')
@Index(['status', 'season'])
export class LeagueMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 1 })
  season: number;

  @Column({ type: 'int', default: 1 })
  round: number;

  @Column({ type: 'uuid', nullable: true })
  player1Id: string | null;

  @Column({ type: 'uuid', nullable: true })
  player2Id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  player1: LeaguePlayer | null;

  @Column({ type: 'jsonb', nullable: true })
  player2: LeaguePlayer | null;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.MATCHING })
  status: MatchStatus;

  @Column({ type: 'uuid', nullable: true })
  winnerId: string | null;

  @Column({ type: 'int', default: 0, comment: 'player1积分变化' })
  player1ScoreChange: number;

  @Column({ type: 'int', default: 0, comment: 'player2积分变化' })
  player2ScoreChange: number;

  @Column({ type: 'int', default: 300, comment: '对战时长上限（秒）' })
  maxDuration: number;

  @Column({ type: 'int', default: 0, comment: '实际耗时（秒）' })
  duration: number;

  @Column({ type: 'jsonb', default: [], comment: '对战事件日志' })
  eventLog: Array<{
    timestamp: number;
    type: string;
    playerId: string;
    data: Record<string, any>;
  }>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
