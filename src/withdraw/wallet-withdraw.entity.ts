// src/withdraw/wallet-withdraw.entity.ts
import { Exclude } from 'class-transformer';
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

  @Column({
    select: false,
  })
  @Exclude()
  privateKey: string;

  @Column({ default: new Date() })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
