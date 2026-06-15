import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('trade_watchlist')
@Index(['playerId', 'itemType', 'itemQuality', 'itemEra'], { unique: true })
export class TradeWatchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  playerId: string;

  @Column({ type: 'varchar', length: 20 })
  itemType: 'fragment' | 'sandglass';

  @Column({ type: 'varchar', length: 20 })
  itemQuality: string;

  @Column({ type: 'varchar', length: 20, default: 'all' })
  itemEra: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  itemName?: string;

  @Column({ type: 'bigint', default: 0 })
  targetPrice: number;

  @Column({ type: 'bigint', default: 0 })
  lastNotifiedPrice: number;

  @Column({ type: 'boolean', default: true })
  notifyEnabled: boolean;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
