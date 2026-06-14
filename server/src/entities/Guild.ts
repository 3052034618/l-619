import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { GuildMember } from './GuildMember';
import { GuildBuilding } from './GuildBuilding';

export enum GuildStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
}

@Entity('guilds')
@Index(['level'])
export class Guild {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tag: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo: string;

  @Column({ type: 'uuid' })
  leaderId: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'bigint', default: 0 })
  exp: number;

  @Column({ type: 'bigint', default: 0 })
  gold: number;

  @Column({ type: 'int', default: 0, comment: '公会声望' })
  reputation: number;

  @Column({ type: 'int', default: 10, comment: '成员上限' })
  maxMembers: number;

  @Column({ type: 'int', default: 0 })
  memberCount: number;

  @Column({ type: 'float', default: 1.0, comment: '沙漏合成成功率加成' })
  craftBonus: number;

  @Column({ type: 'float', default: 1.0, comment: '副本收益加成' })
  dungeonBonus: number;

  @Column({ type: 'enum', enum: GuildStatus, default: GuildStatus.ACTIVE })
  status: GuildStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GuildMember, member => member.guild)
  members: GuildMember[];

  @OneToMany(() => GuildBuilding, building => building.guild)
  buildings: GuildBuilding[];
}
