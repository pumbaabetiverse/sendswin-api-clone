import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;
}
