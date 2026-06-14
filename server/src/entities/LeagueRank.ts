import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Player } from './Player';

export enum LeagueTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  MASTER = 'master',
  GRANDMASTER = 'grandmaster',
}

@Entity('league_ranks')
@Index(['season', 'points'])
export class LeagueRank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Player, player => player.leagueRanks)
  @JoinColumn()
  player: Player;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'varchar', length: 50 })
  playerName: string;

  @Column({ type: 'int', default: 1 })
  season: number;

  @Column({ type: 'enum', enum: LeagueTier, default: LeagueTier.BRONZE })
  tier: LeagueTier;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  wins: number;

  @Column({ type: 'int', default: 0 })
  losses: number;

  @Column({ type: 'int', default: 0 })
  draws: number;

  @Column({ type: 'int', default: 0 })
  winStreak: number;

  @Column({ type: 'int', default: 0 })
  maxWinStreak: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
