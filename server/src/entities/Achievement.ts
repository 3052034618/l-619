import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AchievementType {
  COLLECTION = 'collection',
  CRAFT = 'craft',
  DUNGEON = 'dungeon',
  LEAGUE = 'league',
  TRADE = 'trade',
  GUILD = 'guild',
  SPECIAL = 'special',
}

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: AchievementType })
  type: AchievementType;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'int', default: 0, comment: '成就目标值' })
  targetValue: number;

  @Column({ type: 'jsonb', default: {}, comment: '奖励配置' })
  rewards: {
    exp?: number;
    gold?: number;
    gems?: number;
    fragments?: string[];
    title?: string;
  };

  @Column({ type: 'int', default: 0, comment: '成就点数' })
  points: number;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('player_achievements')
@Index(['playerId', 'achievementId'], { unique: true })
export class PlayerAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'uuid' })
  achievementId: string;

  @Column({ type: 'int', default: 0, comment: '当前进度' })
  progress: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  isClaimed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
