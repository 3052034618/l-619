import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Guild } from './Guild';

export enum BuildingType {
  TIME_TOWER = 'time_tower',
  RESEARCH_HALL = 'research_hall',
  WAREHOUSE = 'warehouse',
  WORKSHOP = 'workshop',
  SHRINE = 'shrine',
}

@Entity('guild_buildings')
export class GuildBuilding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Guild, guild => guild.buildings)
  @JoinColumn()
  guild: Guild;

  @Column({ type: 'uuid' })
  guildId: string;

  @Column({ type: 'enum', enum: BuildingType })
  type: BuildingType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'bigint', default: 0 })
  upgradeProgress: number;

  @Column({ type: 'bigint', default: 0 })
  upgradeRequiredGold: number;

  @Column({ type: 'jsonb', default: {}, comment: '升级所需材料' })
  upgradeRequiredMaterials: Record<string, number>;

  @Column({ type: 'jsonb', default: {}, comment: '建筑提供的加成' })
  bonuses: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
