import { BlockchainHelperService } from '@/blockchain/blockchain-helper.service';
import { BlockchainNetwork, BlockchainToken, SettingKey } from '@/common/const';
import { UsersService } from '@/users/user.service';
import { WalletWithdraw } from '@/withdraw/wallet-withdraw.entity';
import { Withdraw } from '@/withdraw/withdraw.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository, UpdateResult } from 'typeorm';
import { err, ok, Result } from 'neverthrow';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventName } from '@/common/event-name';
import { TelegramWithdrawProcessingEvent } from '@/telegram/telegram.dto';
import { User } from '@/users/user.entity';
import { fromPromiseResult } from '@/common/errors';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  getWithdrawTypeFromSourceId,
  WithdrawStatus,
} from '@/withdraw/withdraw.domain';
import { SettingService } from '@/setting/setting.service';

@Injectable()
export class WithdrawService {
  constructor(
    @InjectRepository(Withdraw)
    private readonly withdrawRepository: Repository<Withdraw>,
    @InjectRepository(WalletWithdraw)
    private readonly walletWithdrawRepository: Repository<WalletWithdraw>,
    private readonly usersService: UsersService,
    private readonly blockchainHelperService: BlockchainHelperService,
    private readonly eventEmitter: EventEmitter2,
    private readonly settingService: SettingService,
  ) {}

  async processUserWithdraw(
    userId: number,
    payout: number,
    sourceId: string,
  ): Promise<Result<void, Error>> {
    // Validate user and check for duplicate withdrawals
    const validationResult = await this.validateWithdrawRequest(
      userId,
      sourceId,
    );
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }
    const user = validationResult.value;

    // Select and update wallet balance
    const walletResult =
      await this.selectAppropriateWalletAndUpdateBalance(payout);
    if (walletResult.isErr()) {
      return err(walletResult.error);
    }
    const wallet = walletResult.value;

    // Create and insert a new withdrawal record
    const insertResult = await this.insertNewWithdraw(
      this.withdrawRepository.create({
        userId,
        payout,
        currency: BlockchainToken.USDT,
        walletAddress: user.walletAddress!,
        sourceId,
        type: getWithdrawTypeFromSourceId(sourceId),
        status: WithdrawStatus.PENDING,
        fromWalletId: wallet.id,
        network: BlockchainNetwork.OPBNB,
      }),
    );
    if (insertResult.isErr()) {
      return err(insertResult.error);
    }

    // Process the blockchain transaction
    return await this.processOnChainTransaction(wallet, user, payout, sourceId);
  }

  async syncWalletBalances(): Promise<Result<void, Error>> {
    const walletsResult = await this.getAllWallets();
    if (walletsResult.isErr()) {
      return err(walletsResult.error);
    }
    const wallets = walletsResult.value;
    for (const wallet of wallets) {
      const usdtBalanceResult =
        await this.blockchainHelperService.getTokenBalance(
          wallet.address,
          BlockchainToken.USDT,
          BlockchainNetwork.OPBNB,
        );

      if (usdtBalanceResult.isOk()) {
        wallet.balanceUsdtOpBnb = usdtBalanceResult.value;
      }
    }
    return (await this.saveAllWallets(wallets)).map(() => undefined);
  }

  private async getAllWallets(): Promise<Result<WalletWithdraw[], Error>> {
    return fromPromiseResult(
      this.walletWithdrawRepository.find({
        select: [
          'id',
          'address',
          'privateKey',
          'lastUsedAt',
          'balanceUsdtOpBnb',
        ],
      }),
    );
  }

  private async isEnableUserWithdraw() {
    const isEnable = await this.settingService.getSetting(
      SettingKey.ENABLE_USER_WITHDRAW,
      'false',
    );
    return isEnable == 'true' || isEnable == '1';
  }

  private async validateWithdrawRequest(
    userId: number,
    sourceId: string,
  ): Promise<Result<User, Error>> {
    const userResult = await this.usersService.findById(userId);
    if (userResult.isErr()) {
      return err(userResult.error);
    }
    const user = userResult.value;
    if (!user?.walletAddress) {
      return err(new Error('User does not have a wallet address'));
    }

    const existingWithdraw = await this.withdrawRepository.findOneBy({
      sourceId,
    });
    if (existingWithdraw) {
      return err(new Error('Withdraw already processed'));
    }

    return ok(user);
  }

  private async processOnChainTransaction(
    wallet: WalletWithdraw,
    user: User,
    payout: number,
    sourceId: string,
  ): Promise<Result<void, Error>> {
    // Check if user withdraw is enabled
    if (!(await this.isEnableUserWithdraw())) {
      return ok();
    }

    // Transfer tokens on blockchain
    const txHashResult = await this.blockchainHelperService.transferToken(
      wallet.privateKey,
      user.walletAddress!,
      BlockchainToken.USDT,
      BlockchainNetwork.OPBNB,
      payout,
    );
    if (txHashResult.isErr()) {
      await this.updateWithdrawBySourceId(sourceId, {
        status: WithdrawStatus.FAIL,
      });
      return err(txHashResult.error);
    }

    const transactionHash = txHashResult.value;

    await this.updateWithdrawBySourceId(sourceId, {
      transactionHash,
      status: WithdrawStatus.PROCESSING,
    });

    // Notify the user via Telegram if possible
    this.notifyUserViaTelegram(user, payout, transactionHash);

    // Get transaction receipt
    const receiptResult =
      await this.blockchainHelperService.getTransactionReceipt(
        transactionHash,
        BlockchainNetwork.OPBNB,
      );

    if (receiptResult.isErr()) {
      await this.updateWithdrawBySourceId(sourceId, {
        status: WithdrawStatus.FAIL,
      });
      return err(receiptResult.error);
    }

    // Update status to success
    await this.updateWithdrawBySourceId(sourceId, {
      status: WithdrawStatus.SUCCESS,
      onChainFee: receiptResult.value.gasUsed.toString(),
    });

    return ok();
  }

  private notifyUserViaTelegram(
    user: User,
    payout: number,
    txHash: string,
  ): void {
    if (user.chatId) {
      this.eventEmitter.emit(EventName.TELEGRAM_WITHDRAW_PROCESSING, {
        userChatId: user.chatId,
        payout,
        txHash,
        network: BlockchainNetwork.OPBNB,
      } satisfies TelegramWithdrawProcessingEvent);
    }
  }

  private async updateWithdrawBySourceId(
    sourceId: string,
    data: QueryDeepPartialEntity<Withdraw>,
  ): Promise<Result<UpdateResult, Error>> {
    return fromPromiseResult(
      this.withdrawRepository.update({ sourceId }, data),
    );
  }

  private async insertNewWithdraw(
    withdraw: Withdraw,
  ): Promise<Result<UpdateResult, Error>> {
    return fromPromiseResult(this.withdrawRepository.insert(withdraw));
  }

  private async selectAppropriateWalletAndUpdateBalance(
    payout: number,
  ): Promise<Result<WalletWithdraw, Error>> {
    const walletResult = await this.findWalletWithSufficientBalance(payout);
    if (walletResult.isErr()) {
      return err(walletResult.error);
    }

    const wallet = walletResult.value;
    if (!wallet) {
      return err(new Error('No wallet found'));
    }

    return this.deductWalletBalance(wallet, payout);
  }

  private async findWalletWithSufficientBalance(
    payout: number,
  ): Promise<Result<WalletWithdraw | null, Error>> {
    return fromPromiseResult(
      this.walletWithdrawRepository.findOne({
        select: [
          'id',
          'address',
          'privateKey',
          'lastUsedAt',
          'balanceUsdtOpBnb',
        ],
        where: {
          balanceUsdtOpBnb: MoreThanOrEqual(payout),
        },
        order: {
          lastUsedAt: 'ASC',
        },
      }),
    );
  }

  private async deductWalletBalance(
    wallet: WalletWithdraw,
    payout: number,
  ): Promise<Result<WalletWithdraw, Error>> {
    wallet.lastUsedAt = new Date();
    wallet.balanceUsdtOpBnb -= payout;
    return fromPromiseResult(this.walletWithdrawRepository.save(wallet));
  }

  private async saveAllWallets(
    wallets: WalletWithdraw[],
  ): Promise<Result<WalletWithdraw[], Error>> {
    return fromPromiseResult(this.walletWithdrawRepository.save(wallets));
  }
}
