// src/withdraws/entities/withdraw.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BlockchainNetwork } from '@/common/const';
import { ColumnNumericTransformer } from '@/common/ColumnNumericTransformer';

export enum WithdrawStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAIL = 'fail',
}

@Entity('withdraws')
export class Withdraw {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  depositOrderId: string;

  @Column()
  userId: number;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 6,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  payout: number;

  @Column()
  currency: string;

  @Column()
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: WithdrawStatus,
    default: WithdrawStatus.PENDING,
  })
  status: WithdrawStatus;

  @Column({ nullable: true })
  transactionHash?: string;

  @Column({ nullable: true })
  network?: BlockchainNetwork;

  @Column({ nullable: true })
  onChainFee?: string;

  @Column({ nullable: true })
  fromWalletId?: number;

  @CreateDateColumn()
  createdAt: Date;
}
