import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Guild } from './Guild';
import { Player } from './Player';

export enum GuildRole {
  LEADER = 'leader',
  OFFICER = 'officer',
  VETERAN = 'veteran',
  MEMBER = 'member',
  RECRUIT = 'recruit',
}

@Entity('guild_members')
@Index(['guildId', 'playerId'], { unique: true })
export class GuildMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Guild, guild => guild.members)
  @JoinColumn()
  guild: Guild;

  @Column({ type: 'uuid' })
  guildId: string;

  @ManyToOne(() => Player, player => player.guildMemberships)
  @JoinColumn()
  player: Player;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'enum', enum: GuildRole, default: GuildRole.RECRUIT })
  role: GuildRole;

  @Column({ type: 'int', default: 0, comment: '累计贡献度' })
  totalContribution: number;

  @Column({ type: 'int', default: 0, comment: '本周贡献度' })
  weeklyContribution: number;

  @Column({ type: 'timestamp' })
  joinedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
