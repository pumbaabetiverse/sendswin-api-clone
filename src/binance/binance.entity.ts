import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DepositOption } from '@/deposits/deposit.entity';
import { NumericColumn } from '@/common/transform-decimal';
import { Exclude } from 'class-transformer';

export enum BinanceAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('binance_accounts')
export class BinanceAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  binanceUsername: string;

  @Column()
  binanceId: string;

  @Column()
  binanceQrCodeUrl: string;

  @Column()
  @Exclude()
  binanceApiKey: string;

  @Column()
  @Exclude()
  binanceApiSecret: string;

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
  })
  usdtBalance: number;

  @Column({
    enum: DepositOption,
    type: 'enum',
  })
  option: DepositOption;

  @Column({
    enum: BinanceAccountStatus,
    type: 'enum',
  })
  status: BinanceAccountStatus;

  @Column({ default: '' })
  proxy: string; // Mandatory proxy configuration for Binance API

  @CreateDateColumn()
  createdAt: Date;
}
