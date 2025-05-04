import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NumericColumn } from '@/common/transform-decimal';

@Entity('wallet_withdraws')
export class WalletWithdraw {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;

  @Column({
    select: false,
  })
  @Exclude({ toPlainOnly: true })
  privateKey: string;

  @NumericColumn({
    round: 6,
    scale: 6,
    precision: 18,
    default: 0,
  })
  balanceUsdtOpBnb: number;

  @Column({ default: new Date() })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
