import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NumericColumn } from '@/common/transform-decimal';

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
  refCode?: string;

  @Column({ nullable: true })
  parentId?: number;

  @Column({ nullable: true })
  binanceUsername?: string;

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
    default: 0,
  })
  balance: number;

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
    default: 0,
  })
  previousBalance: number;
}
