// src/withdraw/wallet-withdraw.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('wallet_withdraws')
export class WalletWithdraw {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;

  @Column()
  privateKey: string;

  @Column({ default: new Date() })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
