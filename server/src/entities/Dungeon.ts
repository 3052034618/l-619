import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { DungeonSession } from './DungeonSession';

export enum DungeonEra {
  ANCIENT = 'ancient',
  MEDIEVAL = 'medieval',
  RENAISSANCE = 'renaissance',
  MODERN = 'modern',
  FUTURE = 'future',
  MYTHICAL = 'mythical',
}

export enum DungeonDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  NIGHTMARE = 'nightmare',
  HELL = 'hell',
}

@Entity('dungeons')
export class Dungeon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: DungeonEra })
  era: DungeonEra;

  @Column({ type: 'enum', enum: DungeonDifficulty, default: DungeonDifficulty.NORMAL })
  difficulty: DungeonDifficulty;

  @Column({ type: 'int', default: 1, comment: '时间流速倍率 0.5-3.0x100' })
  timeFlowRate: number;

  @Column({ type: 'int', default: 600, comment: '副本时间余额（秒）' })
  maxTimeBalance: number;

  @Column({ type: 'int', default: 1 })
  minPlayers: number;

  @Column({ type: 'int', default: 5 })
  maxPlayers: number;

  @Column({ type: 'int', default: 1 })
  requiredLevel: number;

  @Column({ type: 'jsonb', default: [], comment: '时光裂缝位置列表' })
  timeRifts: Array<{ x: number; y: number; z: number; era: string; active: boolean }>;

  @Column({ type: 'jsonb', default: [], comment: '历史事件碎片列表' })
  eventFragments: Array<{ id: string; name: string; description: string; rewards: any }>;

  @Column({ type: 'jsonb', default: [], comment: '守时怪物配置' })
  guardians: Array<{ id: string; name: string; hp: number; attack: number; abilities: string[] }>;

  @Column({ type: 'jsonb', default: {}, comment: '奖励配置' })
  rewards: {
    exp: number;
    gold: number;
    fragmentChance: number;
    rareFragmentChance: number;
    legendaryFragmentChance: number;
  };

  @Column({ type: 'float', default: 0.05, comment: '时间风暴触发概率' })
  timeStormChance: number;

  @Column({ type: 'float', default: 0.03, comment: '历史修正事件概率' })
  correctionEventChance: number;

  @Column({ type: 'int', default: 0, comment: '热度值' })
  popularity: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => DungeonSession, session => session.dungeon)
  sessions: DungeonSession[];
}
