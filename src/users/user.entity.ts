// src/users/user.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'telegram_id', unique: true })
  telegramId: string;

  @Column({ name: 'telegram_full_name' })
  telegramFullName: string;

  @Column({ name: 'wallet_address', nullable: true })
  walletAddress?: string;

  @Column({ name: 'chat_id', nullable: true })
  chatId?: string;

  @Column({ nullable: true })
  binanceUsername?: string;

  @Column({ default: '' })
  binanceLinkKey: string;
}
