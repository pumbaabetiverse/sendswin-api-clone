// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/users/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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
  ): Promise<User> {
    const existingUser = await this.findByTelegramId(telegramId);

    if (existingUser) {
      if (existingUser.binanceLinkKey == '') {
        existingUser.binanceLinkKey = this.generateRandomString(8);
        await this.usersRepository.save(existingUser);
      }
      if (chatId && existingUser.chatId !== chatId) {
        existingUser.chatId = chatId;
        await this.usersRepository.save(existingUser);
      }
      return existingUser;
    }

    const newUser = this.usersRepository.create({
      telegramId,
      telegramFullName,
      chatId,
      binanceLinkKey: this.generateRandomString(8),
    });

    return this.usersRepository.save(newUser);
  }

  async updateWalletAddress(
    telegramId: string,
    walletAddress: string,
  ): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);

    if (!user) {
      return null;
    }

    user.walletAddress = walletAddress;
    return this.usersRepository.save(user);
  }

  async findByBinanceUsername(binanceUsername: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { binanceUsername } });
  }

  async updateBinanceUsername(
    telegramId: string,
    binanceUsername: string,
  ): Promise<User | null> {
    const user = await this.findByTelegramId(telegramId);

    if (!user) {
      return null;
    }

    user.binanceUsername = binanceUsername;
    return this.usersRepository.save(user);
  }

  async updateBinanceUsernameByLinkKey(
    binanceLinkKey: string,
    binanceUsername: string,
  ) {
    const existingUser = await this.findByBinanceUsername(binanceUsername);

    if (existingUser) {
      if (binanceLinkKey != existingUser.binanceLinkKey) {
        return null;
      } else {
        existingUser.binanceUsername = binanceUsername;
        await this.usersRepository.save(existingUser);
        return existingUser;
      }
    }

    const user = await this.usersRepository.findOneBy({
      binanceLinkKey,
    });

    if (!user) {
      return null;
    }

    user.binanceUsername = binanceUsername;
    return await this.usersRepository.save(user);
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
