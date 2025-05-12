// src/deposits/entities/deposit.entity.ts

import { NumericColumn } from '@/common/transform-decimal';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DepositResult {
  WIN = 'win',
  LOSE = 'lose',
  VOID = 'void',
}

export enum DepositOption {
  OVER = 'over',
  UNDER = 'under',
  ODD = 'odd',
  EVEN = 'even',
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

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
    default: 0,
  })
  amount: number;

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
    default: 0,
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

  @Column({
    nullable: true,
  })
  toBinanceAccountId?: number;

  @CreateDateColumn()
  createdAt: Date;
}
