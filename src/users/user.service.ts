import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { User } from '@/users/user.entity';
import { isAddress } from 'viem';
import { err, ok, Result } from 'neverthrow';
import { fromPromiseResult } from '@/common/errors';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async countUserChild(id: number): Promise<Result<number, Error>> {
    return fromPromiseResult(
      this.usersRepository.countBy({
        parentId: id,
      }),
    );
  }

  async findById(id: number): Promise<Result<User | null, Error>> {
    return fromPromiseResult(
      this.usersRepository.findOneBy({
        id,
      }),
    );
  }

  async findByTelegramId(
    telegramId: string,
  ): Promise<Result<User | null, Error>> {
    return fromPromiseResult(
      this.usersRepository.findOne({ where: { telegramId } }),
    );
  }

  async findUserByRefCode(
    refCode: string,
  ): Promise<Result<User | null, Error>> {
    return fromPromiseResult(
      this.usersRepository.findOne({ where: { refCode } }),
    );
  }

  async createOrUpdateUser(
    telegramId: string,
    telegramFullName: string,
    chatId?: string,
    inviteCode?: string,
  ): Promise<Result<User, Error>> {
    const existingUserResult = await this.findByTelegramId(telegramId);

    if (existingUserResult.isErr()) {
      return err(existingUserResult.error);
    }

    const existingUser = existingUserResult.value;

    if (existingUser) {
      if (chatId && existingUser.chatId !== chatId) {
        existingUser.chatId = chatId;
        return this.saveUser(existingUser);
      }
      return ok(existingUser);
    }

    let parentId: number | undefined;

    if (inviteCode) {
      const parentUserResult = await this.findUserByRefCode(inviteCode);
      if (parentUserResult.isOk() && parentUserResult.value) {
        parentId = parentUserResult.value.id;
      }
    }

    return this.saveUser(
      this.usersRepository.create({
        telegramId,
        telegramFullName,
        chatId,
        refCode: this.generateRandomString(8),
        parentId,
      }),
    );
  }

  async updateWalletAddress(
    userId: number,
    walletAddress: string,
  ): Promise<Result<UpdateResult, Error>> {
    if (!isAddress(walletAddress)) {
      return err(new Error('Invalid wallet address'));
    }

    return fromPromiseResult(
      this.usersRepository.update(
        {
          id: userId,
        },
        {
          walletAddress,
        },
      ),
    );
  }

  async findByBinanceUsername(
    binanceUsername: string,
  ): Promise<Result<User | null, Error>> {
    return fromPromiseResult(
      this.usersRepository.findOne({ where: { binanceUsername } }),
    );
  }

  async updateBinanceUsername(
    userId: number,
    binanceUsername: string,
  ): Promise<Result<UpdateResult, Error>> {
    const existingUserResult =
      await this.findByBinanceUsername(binanceUsername);

    if (existingUserResult.isErr()) {
      return err(existingUserResult.error);
    }

    if (existingUserResult.value) {
      return err(new Error('Binance username already exists'));
    }

    return fromPromiseResult(
      this.usersRepository.update(
        {
          id: userId,
        },
        {
          binanceUsername,
        },
      ),
    );
  }

  private async saveUser(user: User): Promise<Result<User, Error>> {
    return fromPromiseResult(this.usersRepository.save(user));
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
