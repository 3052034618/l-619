import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TradeStatus {
  LISTED = 'listed',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum TradeItemType {
  FRAGMENT = 'fragment',
  SANDGLASS = 'sandglass',
}

@Entity('trades')
@Index(['status', 'itemType', 'itemQuality'])
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'varchar', length: 50 })
  sellerName: string;

  @Column({ type: 'uuid', nullable: true })
  buyerId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  buyerName: string | null;

  @Column({ type: 'enum', enum: TradeItemType })
  itemType: TradeItemType;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'varchar', length: 100 })
  itemName: string;

  @Column({ type: 'varchar', length: 50 })
  itemEra: string;

  @Column({ type: 'varchar', length: 50 })
  itemQuality: string;

  @Column({ type: 'jsonb', default: {} })
  itemDetails: Record<string, any>;

  @Column({ type: 'bigint' })
  price: number;

  @Column({ type: 'bigint', default: 0 })
  suggestedPrice: number;

  @Column({ type: 'bigint', default: 0, comment: '7天成交均价' })
  avg7dPrice: number;

  @Column({ type: 'enum', enum: TradeStatus, default: TradeStatus.LISTED })
  status: TradeStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  soldAt: Date;

  @Column({ type: 'float', default: 0, comment: '交易触发的时间涟漪强度 0-1' })
  timeRippleStrength: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
