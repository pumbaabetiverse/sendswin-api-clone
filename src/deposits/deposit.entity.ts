// src/deposits/entities/deposit.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '@/common/ColumnNumericTransformer';

export enum DepositResult {
  WIN = 'win',
  LOSE = 'lose',
  VOID = 'void',
}

export enum DepositOption {
  OVER = 'over',
  UNDER = 'under',
  LUCKY_NUMBER = 'lucky_number',
}

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  uid: number;

  @Column()
  counterpartyId: number;

  @Column({
    unique: true,
  })
  orderId: string;

  @Column()
  note: string;

  @Column()
  orderType: string;

  @Column()
  transactionId: string;

  @Column()
  transactionTime: Date;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 6,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

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
  walletType: number;

  @Column()
  totalPaymentFee: string;

  @Column({
    type: 'enum',
    enum: DepositResult,
    default: DepositResult.VOID,
  })
  result: DepositResult;

  @Column({
    type: 'enum',
    enum: DepositOption,
    nullable: true,
  })
  option?: DepositOption;

  @Column({
    nullable: true,
  })
  userId?: number;

  @Column({
    nullable: true,
  })
  payerUsername?: string;

  @CreateDateColumn()
  createdAt: Date;
}
