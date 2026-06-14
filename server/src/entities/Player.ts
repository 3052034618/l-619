import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { PlayerInventory } from './PlayerInventory';
import { Sandglass } from './Sandglass';
import { GuildMember } from './GuildMember';
import { LeagueRank } from './LeagueRank';

export enum PlayerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  IN_DUNGEON = 'in_dungeon',
  IN_LEAGUE = 'in_league',
  BUSY = 'busy',
}

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'bigint', default: 0 })
  exp: number;

  @Column({ type: 'bigint', default: 1000 })
  gold: number;

  @Column({ type: 'int', default: 0 })
  gems: number;

  @Column({ type: 'int', default: 0, comment: '工匠熟练度' })
  craftMastery: number;

  @Column({ type: 'int', default: 0, comment: '沙漏收藏度' })
  collectionScore: number;

  @Column({ type: 'int', default: 0, comment: '时光联赛积分' })
  leaguePoints: number;

  @Column({ type: 'int', default: 0, comment: '公会贡献度' })
  guildContribution: number;

  @Column({ type: 'jsonb', default: {}, comment: '工坊布局配置' })
  workshopLayout: Record<string, any>;

  @Column({ type: 'enum', enum: PlayerStatus, default: PlayerStatus.OFFLINE })
  status: PlayerStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PlayerInventory, inventory => inventory.player)
  inventories: PlayerInventory[];

  @OneToMany(() => Sandglass, sandglass => sandglass.owner)
  sandglasses: Sandglass[];

  @OneToMany(() => GuildMember, member => member.player)
  guildMemberships: GuildMember[];

  @OneToMany(() => LeagueRank, rank => rank.player)
  leagueRanks: LeagueRank[];
}
