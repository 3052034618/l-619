import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, Index } from 'typeorm';
import { Player } from './Player';
import { Fragment } from './Fragment';
import { Sandglass } from './Sandglass';

@Entity('player_inventories')
export class PlayerInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  playerId: string;

  @Column({ type: 'int', default: 50, comment: '碎片容量' })
  fragmentCapacity: number;

  @Column({ type: 'int', default: 20, comment: '沙漏容量' })
  sandglassCapacity: number;

  @OneToMany(() => Fragment, fragment => fragment.inventory)
  fragments: Fragment[];

  @OneToMany(() => Sandglass, sandglass => sandglass.inventory)
  sandglasses: Sandglass[];
}
