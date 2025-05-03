// src/withdraws/entities/withdraw.entity.ts

import { BlockchainNetwork } from '@/common/const';
import { NumericColumn } from '@/common/transform-decimal';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum WithdrawStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAIL = 'fail',
}

@Entity('withdraws')
export class Withdraw {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  depositOrderId: string;

  @Column({ nullable: true, unique: true })
  sourceId?: string;

  @Column()
  userId: number;

  @NumericColumn({
    round: 6,
    scale: 6,
    precision: 18,
    default: 0,
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
