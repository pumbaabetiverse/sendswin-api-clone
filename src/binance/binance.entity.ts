import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DepositOption } from '@/deposits/deposit.entity';

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
  binanceApiKey: string;

  @Column()
  binanceApiSecret: string;

  @Column({
    type: 'numeric',
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

  @CreateDateColumn()
  createdAt: Date;
}
