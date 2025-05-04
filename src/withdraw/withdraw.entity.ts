import { BlockchainNetwork } from '@/common/const';
import { NumericColumn } from '@/common/transform-decimal';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WithdrawStatus, WithdrawType } from '@/withdraw/withdraw.domain';

@Entity('withdraws')
export class Withdraw {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  sourceId: string;

  @Column()
  userId: number;

  @Column({ default: WithdrawType.GAME, enum: WithdrawType, type: 'enum' })
  type: WithdrawType;

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
