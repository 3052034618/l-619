import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PlayerInventory } from './PlayerInventory';

export enum FragmentEra {
  ANCIENT = 'ancient',
  MEDIEVAL = 'medieval',
  RENAISSANCE = 'renaissance',
  MODERN = 'modern',
  FUTURE = 'future',
  MYTHICAL = 'mythical',
}

export enum FragmentQuality {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('fragments')
export class Fragment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: FragmentEra })
  era: FragmentEra;

  @Column({ type: 'enum', enum: FragmentQuality })
  quality: FragmentQuality;

  @Column({ type: 'int', default: 1, comment: '碎片槽位编号 1-4' })
  slotPosition: number;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, number>;

  @Column({ type: 'int', default: 0, comment: '碎片时空能量值' })
  temporalEnergy: number;

  @ManyToOne(() => PlayerInventory, inventory => inventory.fragments, { nullable: true })
  @JoinColumn()
  inventory: PlayerInventory;

  @Column({ type: 'uuid', nullable: true })
  inventoryId: string | null;

  @Column({ type: 'int', default: false })
  isListed: boolean;

  @Column({ type: 'bigint', default: 0, comment: '建议价格' })
  suggestedPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
