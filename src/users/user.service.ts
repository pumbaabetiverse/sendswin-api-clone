// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { User } from '@/users/user.entity';
import { isAddress } from 'viem';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async countUserChild(id: number): Promise<number> {
    return this.usersRepository.countBy({
      parentId: id,
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({
      id,
    });
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { telegramId } });
  }

  async createOrUpdateUser(
    telegramId: string,
    telegramFullName: string,
    chatId?: string,
    inviteCode?: string,
  ): Promise<User> {
    const existingUser = await this.findByTelegramId(telegramId);

    if (existingUser) {
      if (chatId && existingUser.chatId !== chatId) {
        existingUser.chatId = chatId;
        return await this.usersRepository.save(existingUser);
      }
      return existingUser;
    }

    let parentId: number | undefined;

    if (inviteCode) {
      const parentUser = await this.usersRepository.findOneBy({
        refCode: inviteCode,
      });
      if (parentUser) {
        parentId = parentUser.id;
      }
    }

    const newUser = this.usersRepository.create({
      telegramId,
      telegramFullName,
      chatId,
      refCode: this.generateRandomString(8),
      parentId,
    });

    return this.usersRepository.save(newUser);
  }

  async updateWalletAddress(
    userId: number,
    walletAddress: string,
  ): Promise<UpdateResult> {
    if (!isAddress(walletAddress)) {
      throw new Error('Invalid wallet address');
    }

    return await this.usersRepository.update(
      {
        id: userId,
      },
      {
        walletAddress,
      },
    );
  }

  async findByBinanceUsername(binanceUsername: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { binanceUsername } });
  }

  async updateBinanceUsername(
    userId: number,
    binanceUsername: string,
  ): Promise<UpdateResult> {
    if (await this.findByBinanceUsername(binanceUsername)) {
      throw new Error('Binance username already exists');
    }

    return await this.usersRepository.update(
      {
        id: userId,
      },
      {
        binanceUsername,
      },
    );
  }

  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }
}
